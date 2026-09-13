import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';
import { getPickupRule, getTotalWeight } from './src/services/pickupRules';
import { MATERIAL_CATEGORIES } from './src/types';
import { forwardGeocode } from './src/services/location';
import { calculatePartnerOffer, nearbyPartners } from './src/services/partnerDirectory';
import { findReferenceMaterial, referencePrice as getReferencePrice } from './src/services/pricingCatalog';

dotenv.config({ path: path.resolve('.env') });

// Suppress noisy Firestore BloomFilter errors
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  if (typeof args[0] === 'string' && (args[0].includes('BloomFilter') || args[0].includes('GrpcConnection') || args[0].includes('ECONNRESET'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Initialize Firebase Client SDK (Server-Side)
let db: any;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve('./firebase-applet-config.json'), 'utf8'));
  const appFirebase = initializeApp(firebaseConfig);
  db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);
  console.log('Firebase initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase.', error);
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'recysetu_development_secret_key_123';
const DEFAULT_DEMO_LOCATION = {
  formattedAddress: 'Bhilai, Chhattisgarh, India',
  locality: 'Kohka',
  landmark: 'Industrial Area',
  city: 'Bhilai',
  district: 'Durg',
  state: 'Chhattisgarh',
  country: 'India',
  pincode: '490001',
  latitude: 21.1938,
  longitude: 81.3509
};

app.use(cors());
app.use(express.json());
app.use(cookieParser());
// Prevent caching of API responses to avoid stale data issues
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// --- Database Seeding ---
async function seedDemoUsers() {
  if (!db) return;
  try {
    const demoLocation = {
      formattedAddress: 'Bhilai, Chhattisgarh, India',
      city: 'Bhilai',
      district: 'Durg',
      state: 'Chhattisgarh',
      country: 'India',
      pincode: '490001',
      latitude: 21.1938,
      longitude: 81.3509,
      locality: 'Kohka',
      landmark: 'Industrial Area'
    };

    const demoUsers = [
      { id: 'demo-recycler', role: 'recycler', mobile: '9876543211', name: 'Demo Recycler', preferredLanguage: 'en', password: 'password123', address: demoLocation.formattedAddress, location: demoLocation, latitude: demoLocation.latitude, longitude: demoLocation.longitude },
      { id: 'demo-admin', role: 'admin', mobile: '9876543212', name: 'Demo Admin', preferredLanguage: 'en', password: 'admin123', address: demoLocation.formattedAddress, location: demoLocation, latitude: demoLocation.latitude, longitude: demoLocation.longitude },
      { id: 'demo-collector', role: 'collector', mobile: '9876543210', name: 'Demo Collector', preferredLanguage: 'en', password: 'collector123', address: demoLocation.formattedAddress, location: demoLocation, latitude: demoLocation.latitude, longitude: demoLocation.longitude },
      { id: 'demo-aggregator', role: 'aggregator', mobile: '9876543213', name: 'Demo Aggregator', preferredLanguage: 'en', password: 'aggregator123', address: demoLocation.formattedAddress, location: demoLocation, latitude: demoLocation.latitude, longitude: demoLocation.longitude }
    ];

    for (const demoUser of demoUsers) {
      const ref = doc(db, 'users', demoUser.id);
      const snapshot = await getDoc(ref);
      const existingData = snapshot.exists() ? snapshot.data() : {};
      const payload = {
        ...existingData,
        ...demoUser,
        location: existingData.location || demoUser.location,
        latitude: existingData.latitude ?? demoUser.latitude,
        longitude: existingData.longitude ?? demoUser.longitude,
        address: existingData.address || demoUser.address
      };
      if (!snapshot.exists() || !snapshot.data()?.password || !snapshot.data()?.location) {
        await setDoc(ref, payload, { merge: true });
      }
    }

    console.log('Demo users seeded.');
  } catch (error) {
    console.error('Error seeding demo users:', error);
  }
}
seedDemoUsers();

// --- API Routes ---

// Helper to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Note: Math.random is used here just for the prototype as requested, though ideally crypto is better.
}

app.post('/api/auth/request-otp', async (req, res) => {
  const { mobile, role } = req.body;
  if (!mobile || !role || !['collector', 'aggregator'].includes(role)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

  try {
    // Invalidate previous OTPs for this mobile
    if (db) {
      const q = query(collection(db, 'otp_requests'), where('mobile', '==', mobile), where('status', '==', 'pending'));
      const prevRequests = await getDocs(q);
      
      const batch = writeBatch(db);
      prevRequests.forEach(document => {
        batch.update(document.ref, { status: 'expired' });
      });
      
      const newOtpRef = doc(collection(db, 'otp_requests'));
      batch.set(newOtpRef, {
        id: newOtpRef.id,
        mobile,
        otpHash: otp, // In a real app, hash this
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      await batch.commit();
    }

    // Return the OTP in the response ONLY for the prototype demo
    res.json({ success: true, message: 'OTP Generated', prototypeOTP: otp });
  } catch (error) {
    console.error('OTP Request Error:', error);
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { mobile, otp, role } = req.body;
  if (!mobile || !otp || !role) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    if (!db) throw new Error('Database not connected');
    
    const q = query(collection(db, 'otp_requests'), where('mobile', '==', mobile), where('status', '==', 'pending'));
    const otpQuery = await getDocs(q);

    if (otpQuery.empty) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new one.' });
    }

    // Get the most recent one if multiple (shouldn't happen due to invalidation, but just in case)
    let latestDoc = otpQuery.docs[0];
    let latestData = latestDoc.data();
    for (const docSnapshot of otpQuery.docs) {
      if (new Date(docSnapshot.data().createdAt) > new Date(latestData.createdAt)) {
        latestDoc = docSnapshot;
        latestData = docSnapshot.data();
      }
    }

    if (new Date(latestData.expiresAt) < new Date()) {
      await updateDoc(latestDoc.ref, { status: 'expired' });
      return res.status(400).json({ error: 'This OTP has expired. Please request a new OTP.' });
    }

    if (latestData.attempts >= 5) {
      await updateDoc(latestDoc.ref, { status: 'failed' });
      return res.status(400).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    if (latestData.otpHash !== otp) {
      await updateDoc(latestDoc.ref, { attempts: latestData.attempts + 1 });
      return res.status(400).json({ error: 'That OTP is incorrect. Please try again.' });
    }

    // Success! Invalidate OTP.
    await updateDoc(latestDoc.ref, { status: 'verified', verifiedAt: new Date().toISOString() });

    // Check if user exists
    const uq = query(collection(db, 'users'), where('mobile', '==', mobile));
    const usersQuery = await getDocs(uq);
    
    if (usersQuery.empty) {
      // Create a temporary onboarding token
      const tempToken = jwt.sign({ mobile, role, onboarding: true }, JWT_SECRET, { expiresIn: '15m' });
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('temp_auth_token', tempToken, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
      return res.json({ success: true, needsOnboarding: true, mobile, role });
    } else {
      const user = usersQuery.docs[0].data();
      
      // Existing user found - check if the role matches
      if (user.role !== role) {
        return res.status(403).json({ error: `This mobile number is already registered with another RECYSETU role (${user.role}).` });
      }

      if (!user.location && role === 'collector') {
        const mergedUser = { ...user, location: DEFAULT_DEMO_LOCATION, latitude: DEFAULT_DEMO_LOCATION.latitude, longitude: DEFAULT_DEMO_LOCATION.longitude, address: DEFAULT_DEMO_LOCATION.formattedAddress };
        await setDoc(usersQuery.docs[0].ref, mergedUser, { merge: true });
        user.location = mergedUser.location;
        user.latitude = mergedUser.latitude;
        user.longitude = mergedUser.longitude;
        user.address = mergedUser.address;
      }
      
      // Create session token
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true, user });
    }
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

app.post('/api/auth/complete-profile', async (req, res) => {
  const tempToken = req.cookies.temp_auth_token;
  if (!tempToken) {
    return res.status(401).json({ error: 'Unauthorized or onboarding session expired' });
  }
  
  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded.onboarding) {
      return res.status(403).json({ error: 'Invalid onboarding token' });
    }
    
    const { name, address, latitude, longitude, location, preferredLanguage } = req.body;
    if (!name || !address || !preferredLanguage) {
      return res.status(400).json({ error: 'Name, address, and preferred language are required.' });
    }

    const mobile = decoded.mobile;
    const role = decoded.role;
    
    const newUserRef = doc(collection(db, 'users'));
    const resolvedLocation = location || { ...DEFAULT_DEMO_LOCATION, formattedAddress: address || DEFAULT_DEMO_LOCATION.formattedAddress };
    const user = {
      id: newUserRef.id,
      role: role,
      name: name,
      mobile: mobile,
      address: address || resolvedLocation.formattedAddress,
      latitude: latitude ?? resolvedLocation.latitude ?? null,
      longitude: longitude ?? resolvedLocation.longitude ?? null,
      location: resolvedLocation,
      preferredLanguage: preferredLanguage,
      profileCompleted: true,
      points: 0,
      contributionScore: 'Getting Started',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(newUserRef, user);
    
    // Clear temporary token and set real session token
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('temp_auth_token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' } );
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile Completion Error:', error);
    res.status(500).json({ error: 'Failed to complete profile' });
  }
});

app.post('/api/auth/login-password', async (req, res) => {
  const { userId, password, role } = req.body;
  if (!userId || !password || !role) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    if (!db) throw new Error('Database not connected');
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    const userData = userDoc.data();
    const fallbackPassword = userId === 'demo-recycler' ? 'password123' : userId === 'demo-admin' ? 'admin123' : userId === 'demo-collector' ? 'collector123' : userId === 'demo-aggregator' ? 'aggregator123' : undefined;
    const storedPassword = userData?.password ?? fallbackPassword;

    if (!userDoc.exists() || storedPassword !== password || userData?.role !== role) {
      return res.status(401).json({ error: 'Invalid User ID or Password.' });
    }

    if (!userData?.password && fallbackPassword) {
      await setDoc(userRef, { ...userData, password: fallbackPassword }, { merge: true });
    }
    const user = {
      id: userData.id,
      role: userData.role,
      name: userData.name,
      preferredLanguage: userData.preferredLanguage
    };

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('auth_token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' } );
  res.json({ success: true });
});

app.get('/api/auth/session', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (db) {
      const userDoc = await getDoc(doc(db, 'users', decoded.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return res.json({
          user: {
            id: userData.id,
            role: userData.role,
            name: userData.name,
            mobile: userData.mobile,
            address: userData.address,
            latitude: userData.latitude,
            longitude: userData.longitude,
            location: userData.location,
            preferredLanguage: userData.preferredLanguage,
            points: userData.points || 0,
            contributionScore: userData.contributionScore || (userData.role === 'collector' ? 'Building' : null)
          }
        });
      }
    }
    res.json({ user: null });
  } catch (error) {
    res.json({ user: null });
  }
});

// Middleware for protected routes
const requireAuth = (roles: string[]) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (roles.length > 0 && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// --- COLLECTOR APIs ---

app.post('/api/users/update-name', requireAuth([]), async (req, res) => {
  try {
    const { name } = req.body;
    const userId = (req as any).user.userId;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Name is required' });
    
    await updateDoc(doc(db, 'users', userId), { name: name.trim() });
    res.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error('Update name error:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

app.get('/api/collector/profile', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const snapshot = await getDoc(doc(db, 'users', userId));
    if (!snapshot.exists()) return res.status(404).json({ error: 'Profile not found.' });
    const user = snapshot.data();
    res.json({ user: { ...user, password: undefined } });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

app.patch('/api/collector/profile', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, location, address, upiId } = req.body;
    if (location && (!location.formattedAddress || !location.state)) return res.status(400).json({ error: 'A resolved address and state are required.' });
    const changes: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (typeof name === 'string' && name.trim()) changes.name = name.trim();
    if (typeof address === 'string' && address.trim()) changes.address = address.trim();
    if (location) {
      changes.location = location;
      changes.address = location.formattedAddress;
      changes.latitude = location.latitude || null;
      changes.longitude = location.longitude || null;
    }
    if (typeof upiId === 'string') changes.upiId = upiId.trim();
    await updateDoc(doc(db, 'users', userId), changes);
    const updated = await getDoc(doc(db, 'users', userId));
    res.json({ success: true, user: updated.data() });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.get('/api/collector/notifications', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [recipient, legacy] = await Promise.all([
      getDocs(query(collection(db, 'notifications'), where('recipientUserId', '==', userId))),
      getDocs(query(collection(db, 'notifications'), where('userId', '==', userId)))
    ]);
    const seen = new Set<string>();
    const notifications = [...recipient.docs, ...legacy.docs].map(item => item.data()).filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ notifications, unreadCount: notifications.filter(item => !item.isRead).length });
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

app.patch('/api/collector/notifications/:id/read', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const notificationRef = doc(db, 'notifications', req.params.id);
    const notification = await getDoc(notificationRef);
    if (!notification.exists() || (notification.data().recipientUserId !== userId && notification.data().userId !== userId)) return res.status(404).json({ error: 'Notification not found.' });
    await updateDoc(notificationRef, { isRead: true, readAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

app.post('/api/collector/lots/:id/select-partner', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    let lotSnap = await getDocs(query(collection(db, 'lots'), where('lotId', '==', req.params.id), where('collectorId', '==', userId)));
    if (lotSnap.empty) lotSnap = await getDocs(query(collection(db, 'lots'), where('id', '==', req.params.id), where('collectorId', '==', userId)));
    if (lotSnap.empty) return res.status(404).json({ error: 'Lot not found.' });
    const lotDoc = lotSnap.docs[0];
    const lot = lotDoc.data();
    const partnerId = req.body.selectedPartner?.id;
    const location = lot.location;
    const partner = nearbyPartners(Number(location?.latitude), Number(location?.longitude), 25).find(item => item.partnerId === partnerId);
    if (!partner) return res.status(400).json({ error: 'That partner is not eligible for this Lot location.' });
    const referenceValue = Math.round(calculateReferenceTotal(lot.items || [], location?.state));
    const offer = calculatePartnerOffer(partner, referenceValue, lot.totalWeight || getTotalWeight(lot.items || []));
    const selectedPartner = { id: partner.partnerId, name: partner.name, type: partner.role.toLowerCase(), address: partner.address };
    await updateDoc(lotDoc.ref, { assignedPartnerId: partner.partnerId, assignedPartnerType: partner.role.toLowerCase(), partnerName: partner.name, partnerAddress: partner.address, selectedOfferId: offer.offerId, partnerOffer: offer, agreedAmount: offer.finalNetPayout, partnerSelectionStatus: 'SELECTED', updatedAt: new Date().toISOString() });
    res.json({ success: true, lot: { ...lot, ...selectedPartner, selectedOfferId: offer.offerId, partnerOffer: offer, agreedAmount: offer.finalNetPayout } });
  } catch (error) {
    console.error('Select partner error:', error);
    res.status(500).json({ error: 'Failed to select partner.' });
  }
});

app.post('/api/collector/lots/:id/quotation-requests', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const partnerIds = Array.isArray(req.body.partnerIds) ? req.body.partnerIds.filter(Boolean).slice(0, 10) : [];
    if (!partnerIds.length) return res.status(400).json({ error: 'Select at least one partner.' });
    let lotSnap = await getDocs(query(collection(db, 'lots'), where('lotId', '==', req.params.id), where('collectorId', '==', userId)));
    if (lotSnap.empty) lotSnap = await getDocs(query(collection(db, 'lots'), where('id', '==', req.params.id), where('collectorId', '==', userId)));
    if (lotSnap.empty) return res.status(404).json({ error: 'Lot not found.' });
    const lot = lotSnap.docs[0].data();
    const user = (await getDoc(doc(db, 'users', userId))).data() || {};
    const location = lot.location || user.location;
    if (location?.latitude == null || location?.longitude == null) return res.status(400).json({ error: 'Your saved location needs valid coordinates before requesting quotations.' });
    const eligiblePartners = nearbyPartners(Number(location.latitude), Number(location.longitude), 10);
    const eligibleIds = new Set(eligiblePartners.map(partner => partner.partnerId));
    if (partnerIds.some(partnerId => !eligibleIds.has(partnerId))) return res.status(400).json({ error: 'Quotation partners must be within 0–10 km of the saved Collector location.' });
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const requests: any[] = [];
    for (const partnerId of partnerIds) {
      const eligiblePartner = eligiblePartners.find(partner => partner.partnerId === partnerId);
      const requestRef = doc(collection(db, 'quotation_requests'));
      const quotationRequest = { quotationRequestId: requestRef.id, lotId: lot.lotId || lot.id, collectorId: userId, partnerId, materialSnapshot: lot.items || [], totalWeight: lot.totalWeight || getTotalWeight(lot.items || []), estimatedValue: lot.referencePrice?.total || lot.agreedAmount || null, locationSnapshot: location || null, message: typeof req.body.message === 'string' ? req.body.message.trim() : '', requestedAt: now, status: 'SENT', expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), radiusKm: 10 };
      batch.set(requestRef, quotationRequest);
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, { id: notificationRef.id, recipientUserId: partnerId, recipientRole: eligiblePartner?.role.toLowerCase() || 'aggregator', title: 'Quotation requested', message: `Collector requested a quotation for Lot ${quotationRequest.lotId}.`, notificationType: 'QUOTATION_REQUESTED', relatedLotId: lot.id, quotationRequestId: requestRef.id, isRead: false, createdAt: now });
      requests.push(quotationRequest);
    }
    const eventRef = doc(collection(db, 'events'));
    batch.set(eventRef, { id: eventRef.id, eventType: 'QUOTATION_REQUESTED', actorId: userId, actorRole: 'collector', entityType: 'lot', entityId: lot.id, metadata: { partnerIds }, timestamp: now });
    await batch.commit();
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Quotation request error:', error);
    res.status(500).json({ error: 'Failed to send quotation request.' });
  }
});

app.get('/api/collector/lots/:id/quotation-requests', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const snapshot = await getDocs(query(collection(db, 'quotation_requests'), where('lotId', '==', req.params.id), where('collectorId', '==', userId)));
    res.json({ requests: snapshot.docs.map(item => item.data()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotation requests.' });
  }
});

app.get('/api/collector/stats', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // In a real app we'd query collections, but let's mock counts if none exist for now, or just query properly
    const pickupsQ = query(collection(db, 'pickup_requests'), where('collectorId', '==', userId), where('status', 'in', ['REQUESTED', 'ACCEPTED', 'SCHEDULED']));
    const pickupsSnap = await getDocs(pickupsQ);
    
    const lotsQ = query(collection(db, 'lots'), where('collectorId', '==', userId), where('status', 'in', ['PENDING_HANDOVER', 'HANDOVER_CONFIRMED', 'PAYMENT_PROCESSING', 'CREATED', 'PROCESSING']));
    const lotsSnap = await getDocs(lotsQ);
    
    const handoversQ = query(collection(db, 'lots'), where('collectorId', '==', userId), where('status', '==', 'PENDING_HANDOVER'));
    const handoversSnap = await getDocs(handoversQ);
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const uData = userDoc.data() || {};
    
    res.json({
      activePickups: pickupsSnap.size,
      activeLots: lotsSnap.size,
      pendingHandovers: handoversSnap.size,
      earnings: uData.totalEarnings || 0,
      contributionScore: uData.contributionScore || 'Building',
      points: uData.points || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/collector/pickups', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const q = query(collection(db, 'pickup_requests'), where('collectorId', '==', userId));
    const snap = await getDocs(q);
    const pickups = snap.docs.map(d => d.data());
    pickups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ pickups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pickups' });
  }
});

app.get('/api/collector/current-transaction', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const pickupsQ = query(collection(db, 'pickup_requests'), where('collectorId', '==', userId));
    const pickupsSnap = await getDocs(pickupsQ);
    const pickups = pickupsSnap.docs.map(d => d.data());
    pickups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const pickup = pickups.find(p => !['CANCELLED', 'COMPLETED', 'PICKED_UP'].includes(p.status));
    if (!pickup) return res.json({ transaction: null });

    const lotId = pickup.relatedLotId || pickup.lotId;
    let lot = null;
    if (lotId) {
      const lotDoc = await getDoc(doc(db, 'lots', lotId));
      lot = lotDoc.exists() ? lotDoc.data() : null;
    }
    const events = lot ? (await getDocs(query(collection(db, 'events'), where('entityId', '==', lot.id)))).docs.map(d => d.data()) : [];
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json({ transaction: { lot, pickup, events } });
  } catch (error) {
    console.error('Current transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch current transaction' });
  }
});

app.post('/api/collector/pickups', requireAuth(['collector']), async (req, res) => {
  return res.status(410).json({ error: 'Direct pickup creation is disabled. Complete the Collector transaction first.' });
  /*
  try {
    const userId = (req as any).user.userId;
    const { partnerId, location, preferredDate, preferredTime } = req.body;
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const requestId = `RS-PR-${randomNum}`;
    
    const docRef = doc(collection(db, 'pickup_requests'));
    const pickupData = {
      id: docRef.id,
      requestId,
      collectorId: userId,
      assignedPartnerId: partnerId,
      location,
      preferredDate,
      preferredTime,
      status: 'REQUESTED',
      source: 'PWA',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(docRef, pickupData);
    
    // Create Event
    const eventRef = doc(collection(db, 'events'));
    await setDoc(eventRef, {
      id: eventRef.id,
      eventType: 'PICKUP_REQUESTED',
      actorId: userId,
      actorRole: 'collector',
      entityType: 'pickup_request',
      entityId: docRef.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, pickup: pickupData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pickup' });
  }
  */
});

app.post('/api/collector/transactions/finalize', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { draftId, items, location, selectedPartner, pickupDate, pickupTime, paymentPreference, referencePrice: requestReferencePrice, source, bookPickup = false } = req.body;
    if (!draftId || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one material item is required.' });
    if (items.some(item => !item.materialId || typeof item.declaredWeight !== 'number' || item.declaredWeight <= 0 || item.unit !== 'kg')) return res.status(400).json({ error: 'Every material must have a positive weight in kilograms.' });
    if (!location?.formattedAddress || !location?.state) return res.status(400).json({ error: 'A resolved address and state are required.' });
    if (bookPickup && (!pickupDate || !pickupTime)) return res.status(400).json({ error: 'Pickup date and time are required.' });
    if (bookPickup && !['CASH', 'UPI'].includes(paymentPreference)) return res.status(400).json({ error: 'Choose a valid payment preference.' });

    const existing = await getDocs(query(collection(db, 'lots'), where('collectorId', '==', userId)));
    const existingLot = existing.docs.map(document => document.data()).find(lot => lot.draftId === draftId);
    if (existingLot) return res.json({ success: true, lot: existingLot, duplicate: true });
    const activeLotCount = existing.docs.map(document => document.data()).filter(lot => !['COMPLETED', 'CANCELLED', 'RECYCLING_COMPLETED'].includes(lot.status)).length;
    if (activeLotCount >= 5) return res.status(409).json({ error: 'You can have up to 5 active Lots. Please complete, cancel, or remove an existing eligible Lot before creating another.' });

    const lotRef = doc(collection(db, 'lots'));
    const pickupRef = bookPickup ? doc(collection(db, 'pickup_requests')) : null;
    const lotId = `RS-LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const requestId = `RS-PR-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = jwt.sign({ lotId, type: 'handover' }, JWT_SECRET);
    const handoverOtp = generateOTP();
    const now = new Date().toISOString();
    const partner = selectedPartner || {};
    const totalWeight = getTotalWeight(items);
    const referenceTotal = Math.round(calculateReferenceTotal(items, location.state));
    if (!referenceTotal) return res.status(400).json({ error: 'Unable to calculate a reference value for these materials.' });
    const amount = referenceTotal;
    const authoritativeReferencePrice = { rate: totalWeight > 0 ? referenceTotal / totalWeight : 0, total: referenceTotal, source: 'Configured reference catalogue', region: location.state, updatedAt: now };
    const pickupRule = getPickupRule(totalWeight);
    const normalizedItems = items.map(item => ({
      materialId: item.materialId,
      materialName: item.materialName,
      materialCategory: item.materialCategory,
      declaredWeight: item.declaredWeight,
      unit: 'kg',
      estimatedRate: getReferencePrice(String(item.materialId), location.state)?.pricePerKg || Number(item.estimatedRate) || undefined,
      estimatedValue: (getReferencePrice(String(item.materialId), location.state)?.pricePerKg || Number(item.estimatedRate) || 0) * item.declaredWeight
    }));
    const selectedPartnerRecord = partner.id && location.latitude != null && location.longitude != null ? nearbyPartners(Number(location.latitude), Number(location.longitude), 25).find(item => item.partnerId === partner.id) : undefined;
    const partnerOffer = selectedPartnerRecord ? calculatePartnerOffer(selectedPartnerRecord, referenceTotal, totalWeight) : null;
    const lotData: any = {
      id: lotRef.id, lotId, draftId, collectorId: userId, materialId: normalizedItems[0].materialId,
      declaredWeight: normalizedItems[0].declaredWeight, unit: 'kg', items: normalizedItems,
      location, assignedPartnerId: partner.id || null, assignedPartnerType: partner.type || null,
      partnerName: partner.name || null, partnerAddress: partner.address || null, pickupRequestId: pickupRef?.id || null,
      agreedAmount: partnerOffer?.finalNetPayout || amount, referencePrice: authoritativeReferencePrice, selectedOfferId: partnerOffer?.offerId || null, partnerOffer, qrToken, handoverOtp,
      totalWeight, pickupFee: pickupRule.fee, pickupEligibility: pickupRule.tier,
      pickupBookingStatus: bookPickup ? 'REQUESTED' : 'NOT_BOOKED', partnerSelectionStatus: partner.id ? 'SELECTED' : 'PENDING',
      locationSnapshot: location, pricingSource: authoritativeReferencePrice.source, pricingUpdatedAt: now,
      verificationState: 'PENDING', payment: bookPickup ? { preference: paymentPreference, status: 'PENDING' } : null,
      status: 'PENDING_HANDOVER', createdAt: now
    };
    const pickupData: any = bookPickup ? {
      id: pickupRef!.id, requestId, collectorId: userId, assignedPartnerId: partner.id || null,
      assignedPartnerType: partner.type || null, partnerName: partner.name || null, partnerAddress: partner.address || null,
      location: location.formattedAddress, resolvedLocation: location, preferredDate: pickupDate,
      preferredTime: pickupTime, paymentPreference, pickupFee: pickupRule.fee, totalWeight, relatedLotId: lotRef.id, lotId,
      status: 'REQUESTED', source: source || 'PWA', createdAt: now
    } : null;
    const batch = writeBatch(db);
    batch.set(lotRef, lotData);
    const lotEventRef = doc(collection(db, 'events'));
    batch.set(lotEventRef, { id: lotEventRef.id, eventType: 'LOT_CREATED', actorId: userId, actorRole: 'collector', entityType: 'lot', entityId: lotRef.id, timestamp: now });
    if (pickupRef && pickupData) {
      batch.set(pickupRef, pickupData);
      const pickupEventRef = doc(collection(db, 'events'));
      batch.set(pickupEventRef, { id: pickupEventRef.id, eventType: 'PICKUP_REQUESTED', actorId: userId, actorRole: 'collector', entityType: 'pickup_request', entityId: pickupRef.id, metadata: { lotId: lotRef.id }, timestamp: now });
    }
    if (partner.id && partner.type) {
      const partnerEventRef = doc(collection(db, 'events'));
      batch.set(partnerEventRef, { id: partnerEventRef.id, eventType: 'PARTNER_SELECTED', actorId: userId, actorRole: 'collector', entityType: 'lot', entityId: lotRef.id, metadata: { partnerId: partner.id, partnerType: partner.type }, timestamp: now });
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, { id: notificationRef.id, recipientUserId: partner.id, recipientRole: partner.type, title: bookPickup ? 'New Pickup Request' : 'New Lot Assigned', message: bookPickup ? `Pickup request ${requestId} has been assigned to you.` : `Lot ${lotId} has been assigned to you.`, notificationType: bookPickup ? 'PICKUP_ASSIGNED' : 'LOT_ASSIGNED', relatedLotId: lotRef.id, relatedPickupId: pickupRef?.id || null, isRead: false, createdAt: now });
    }
    await batch.commit();
    res.json({ success: true, lot: lotData, pickup: pickupData });
  } catch (error) {
    console.error('Finalize transaction error:', error);
    res.status(500).json({ error: 'Failed to create the final transaction.' });
  }
});

app.post('/api/collector/lots/:id/book-pickup', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { preferredDate, preferredTime, paymentPreference, selectedPartner } = req.body;
    if (!preferredDate || !preferredTime || !['CASH', 'UPI'].includes(paymentPreference)) return res.status(400).json({ error: 'Pickup date, time, and payment preference are required.' });
    let lotQuery = query(collection(db, 'lots'), where('lotId', '==', req.params.id), where('collectorId', '==', userId));
    let lotSnap = await getDocs(lotQuery);
    if (lotSnap.empty) {
      lotQuery = query(collection(db, 'lots'), where('id', '==', req.params.id), where('collectorId', '==', userId));
      lotSnap = await getDocs(lotQuery);
    }
    if (lotSnap.empty) return res.status(404).json({ error: 'Lot not found.' });
    const lotDoc = lotSnap.docs[0];
    const lot = lotDoc.data();
    if (['COMPLETED', 'CANCELLED', 'RECYCLING_COMPLETED'].includes(lot.status)) return res.status(409).json({ error: 'This Lot is not eligible for pickup booking.' });
    if (lot.pickupRequestId) return res.status(409).json({ error: 'Pickup is already booked for this Lot.' });

    const items = Array.isArray(lot.items) ? lot.items : [{ declaredWeight: lot.declaredWeight }];
    const totalWeight = getTotalWeight(items);
    const pickupRule = getPickupRule(totalWeight);
    const partner = selectedPartner || { id: lot.assignedPartnerId, type: lot.assignedPartnerType, name: lot.partnerName, address: lot.partnerAddress };
    const pickupRef = doc(collection(db, 'pickup_requests'));
    const requestId = `RS-PR-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const pickupData: any = {
      id: pickupRef.id, requestId, collectorId: userId, assignedPartnerId: partner.id || null, assignedPartnerType: partner.type || null,
      partnerName: partner.name || null, partnerAddress: partner.address || null, location: lot.location?.formattedAddress || lot.location || null,
      resolvedLocation: lot.location || null, preferredDate, preferredTime, paymentPreference, pickupFee: pickupRule.fee, totalWeight,
      relatedLotId: lotDoc.id, lotId: lot.lotId || lotDoc.id, status: 'REQUESTED', source: 'PWA', createdAt: now
    };
    const batch = writeBatch(db);
    batch.set(pickupRef, pickupData);
    batch.update(lotDoc.ref, {
      pickupRequestId: pickupRef.id, assignedPartnerId: partner.id || lot.assignedPartnerId || null, assignedPartnerType: partner.type || lot.assignedPartnerType || null,
      partnerName: partner.name || lot.partnerName || null, partnerAddress: partner.address || lot.partnerAddress || null,
      pickupFee: pickupRule.fee, pickupEligibility: pickupRule.tier, payment: { preference: paymentPreference, status: 'PENDING' }, updatedAt: now
    });
    const eventRef = doc(collection(db, 'events'));
    batch.set(eventRef, { id: eventRef.id, eventType: 'PICKUP_REQUESTED', actorId: userId, actorRole: 'collector', entityType: 'pickup_request', entityId: pickupRef.id, metadata: { lotId: lotDoc.id, pickupFee: pickupRule.fee }, timestamp: now });
    if (partner.id && partner.type) {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, { id: notificationRef.id, recipientUserId: partner.id, recipientRole: partner.type, title: 'New Pickup Request', message: `Pickup request ${requestId} has been assigned to you.`, notificationType: 'PICKUP_ASSIGNED', relatedLotId: lotDoc.id, relatedPickupId: pickupRef.id, isRead: false, createdAt: now });
    }
    await batch.commit();
    res.json({ success: true, lot: { ...lot, ...{ pickupRequestId: pickupRef.id, pickupFee: pickupRule.fee, pickupEligibility: pickupRule.tier } }, pickup: pickupData });
  } catch (error) {
    console.error('Book pickup error:', error);
    res.status(500).json({ error: 'Failed to book pickup.' });
  }
});

app.post('/api/collector/lots/:id/cancel', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    let lotQuery = query(collection(db, 'lots'), where('lotId', '==', req.params.id), where('collectorId', '==', userId));
    let lotSnap = await getDocs(lotQuery);
    if (lotSnap.empty) lotSnap = await getDocs(query(collection(db, 'lots'), where('id', '==', req.params.id), where('collectorId', '==', userId)));
    if (lotSnap.empty) return res.status(404).json({ error: 'Lot not found.' });
    const lotDoc = lotSnap.docs[0];
    const lot = lotDoc.data();
    if (['COMPLETED', 'RECYCLING_COMPLETED'].includes(lot.status)) return res.status(409).json({ error: 'Completed Lots cannot be deleted.' });
    if (lot.pickupRequestId) return res.status(409).json({ error: 'This Lot has a PickupRequest and cannot be cancelled from the Collector view.' });
    if (lot.status === 'CANCELLED') return res.json({ success: true, status: 'CANCELLED' });
    await updateDoc(lotDoc.ref, { status: 'CANCELLED', cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    res.json({ success: true, status: 'CANCELLED' });
  } catch (error) {
    console.error('Cancel lot error:', error);
    res.status(500).json({ error: 'Failed to cancel Lot.' });
  }
});

app.get('/api/collector/lots', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const lotsQ = query(collection(db, 'lots'), where('collectorId', '==', userId));
    const lotsSnap = await getDocs(lotsQ);
    const pickupSnap = await getDocs(query(collection(db, 'pickup_requests'), where('collectorId', '==', userId)));
    const pickups = pickupSnap.docs.map(d => d.data());
    const lots: any[] = lotsSnap.docs.map(d => {
      const lot = d.data();
      return { ...lot, pickup: pickups.find(pickup => pickup.relatedLotId === lot.id || pickup.lotId === lot.id) || null };
    });
    // Sort descending by createdAt
    lots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ lots });
  } catch (error) {
    console.error('Fetch lots error:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

app.post('/api/collector/lots', requireAuth(['collector']), async (req, res) => {
  return res.status(410).json({ error: 'Direct Lot creation is disabled. Complete the Collector transaction first.' });
  /*
  try {
    const userId = (req as any).user.userId;
    const { 
      materialId, quantity, unit, // For backward compatibility
      items, // New multi-material support
      assignedPartnerId, assignedPartnerType, 
      paymentPreference,
      pickupRequestId
    } = req.body;
    
    // Normalize items
    let finalItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      finalItems = items;
    } else if (materialId && quantity) {
      finalItems = [{
        materialId,
        declaredWeight: quantity,
        unit: unit || 'kg'
      }];
    }

    if (finalItems.length === 0) {
      return res.status(400).json({ error: 'At least one material item is required' });
    }
    
    // Generate Lot ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const lotIdStr = `RS-LOT-${new Date().getFullYear()}-${randomNum}`;
    
    // Generate Secure QR Token
    const qrToken = jwt.sign({ lotId: lotIdStr, type: 'handover' }, JWT_SECRET);

    // Generate Handover OTP
    const handoverOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newLotRef = doc(collection(db, 'lots'));
    const lotData: any = {
      id: newLotRef.id,
      lotId: lotIdStr,
      collectorId: userId,
      
      // Backward compatibility fields
      materialId: finalItems[0].materialId,
      declaredWeight: finalItems[0].declaredWeight,
      unit: finalItems[0].unit,
      
      items: finalItems,
      
      assignedPartnerId: assignedPartnerId || null,
      assignedPartnerType: assignedPartnerType || null,
      pickupRequestId: pickupRequestId || null,
      
      qrToken, 
      handoverOtp,
      verificationState: 'PENDING',
      
      payment: paymentPreference ? {
        preference: paymentPreference,
        status: 'PENDING'
      } : null,
      
      status: 'PENDING_HANDOVER',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(newLotRef, lotData);
    
    // Create Event
    const eventRef = doc(collection(db, 'events'));
    await setDoc(eventRef, {
      id: eventRef.id,
      eventType: 'LOT_CREATED',
      actorId: userId,
      actorRole: 'collector',
      entityType: 'lot',
      entityId: newLotRef.id,
      timestamp: new Date().toISOString()
    });

    if (assignedPartnerId && assignedPartnerType) {
      const pEventRef = doc(collection(db, 'events'));
      await setDoc(pEventRef, {
        id: pEventRef.id,
        eventType: 'PARTNER_SELECTED',
        actorId: userId,
        actorRole: 'collector',
        entityType: 'lot',
        entityId: newLotRef.id,
        metadata: { partnerId: assignedPartnerId, partnerType: assignedPartnerType },
        timestamp: new Date().toISOString()
      });

      // Create Notification for the assigned partner
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        recipientUserId: assignedPartnerId,
        recipientRole: assignedPartnerType,
        title: 'New Lot Assigned',
        message: `Lot ${lotIdStr} has been assigned to you.`,
        notificationType: 'LOT_ASSIGNED',
        relatedLotId: newLotRef.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, lot: lotData });
  } catch (error) {
    console.error('Create lot error:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
  */
});

// A dummy AI mock for demo purposes (as requested not to expose keys, we put it on backend)
app.get('/api/collector/lots/:id', requireAuth(['collector']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    let lotsQ = query(collection(db, 'lots'), where('lotId', '==', id), where('collectorId', '==', userId));
    let lotsSnap = await getDocs(lotsQ);
    
    if (lotsSnap.empty) {
      lotsQ = query(collection(db, 'lots'), where('id', '==', id), where('collectorId', '==', userId));
      lotsSnap = await getDocs(lotsQ);
    }
    
    if (lotsSnap.empty) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const lotData = lotsSnap.docs[0].data();
    
    // Fetch events for traceability
    const eventsQ = query(collection(db, 'events'), where('entityId', '==', lotData.id));
    const eventsSnap = await getDocs(eventsQ);
    const events = eventsSnap.docs.map(d => d.data());
    const pickupSnap = await getDocs(query(collection(db, 'pickup_requests'), where('relatedLotId', '==', lotData.id)));
    const pickup = pickupSnap.empty ? null : pickupSnap.docs[0].data();
    
    // Sort events descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({ lot: { ...lotData, pickup }, events });
  } catch (error) {
    console.error('Fetch lot details error:', error);
    res.status(500).json({ error: 'Failed to fetch lot details' });
  }
});

app.get('/api/collector/points-history', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const q = query(collection(db, 'points_transactions'), where('collectorId', '==', userId));
    const snap = await getDocs(q);
    const transactions = snap.docs.map(d => d.data());
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

app.post('/api/lots/:id/confirm-handover', requireAuth(['aggregator', 'recycler', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { qrToken, otp } = req.body;
    
    let lotQ = query(collection(db, 'lots'), where('lotId', '==', id));
    let lotsSnap = await getDocs(lotQ);
    
    if (lotsSnap.empty) {
      lotQ = query(collection(db, 'lots'), where('__name__', '==', id));
      lotsSnap = await getDocs(lotQ);
    }
    
    if (lotsSnap.empty) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const lotDoc = lotsSnap.docs[0];
    const lotData = lotDoc.data();
    
    if (lotData.status !== 'PENDING_HANDOVER') {
      return res.status(400).json({ error: 'Lot is not pending handover' });
    }
    
    // Verify QR/OTP logic would go here. For now, assume verification passed if endpoint called.
    if (qrToken && lotData.qrToken !== qrToken) {
       // Just basic check for illustration
       // return res.status(400).json({ error: 'Invalid QR token' });
    }

    await updateDoc(doc(db, 'lots', lotDoc.id), {
      status: 'HANDOVER_CONFIRMED',
      verificationState: 'VERIFIED',
      updatedAt: new Date().toISOString()
    });
    
    // Create HANDOVER_CONFIRMED event
    const eventRef = doc(collection(db, 'events'));
    await setDoc(eventRef, {
      id: eventRef.id,
      eventType: 'HANDOVER_CONFIRMED',
      actorId: (req as any).user.userId,
      actorRole: (req as any).user.role,
      entityType: 'lot',
      entityId: lotDoc.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, status: 'HANDOVER_CONFIRMED' });
  } catch (error) {
    console.error('Confirm handover error:', error);
    res.status(500).json({ error: 'Failed to confirm handover' });
  }
});

app.post('/api/lots/:id/payment-processing', requireAuth(['aggregator', 'recycler', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    let lotQ = query(collection(db, 'lots'), where('lotId', '==', id));
    let lotsSnap = await getDocs(lotQ);
    
    if (lotsSnap.empty) {
      lotQ = query(collection(db, 'lots'), where('__name__', '==', id));
      lotsSnap = await getDocs(lotQ);
    }
    
    if (lotsSnap.empty) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const lotDoc = lotsSnap.docs[0];
    const lotData = lotDoc.data();
    
    if (lotData.status !== 'HANDOVER_CONFIRMED') {
      return res.status(400).json({ error: 'Lot must be HANDOVER_CONFIRMED before processing payment' });
    }
    
    await updateDoc(doc(db, 'lots', lotDoc.id), {
      status: 'PAYMENT_PROCESSING',
      'payment.status': 'PROCESSING',
      updatedAt: new Date().toISOString()
    });
    
    // Create PAYMENT_PROCESSING event
    const eventRef = doc(collection(db, 'events'));
    await setDoc(eventRef, {
      id: eventRef.id,
      eventType: 'PAYMENT_PROCESSING',
      actorId: (req as any).user.userId,
      actorRole: (req as any).user.role,
      entityType: 'lot',
      entityId: lotDoc.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, status: 'PAYMENT_PROCESSING' });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

app.post('/api/lots/:id/complete', requireAuth(['collector', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the lot by lotId or document id
    let lotQ = query(collection(db, 'lots'), where('lotId', '==', id));
    let lotsSnap = await getDocs(lotQ);
    
    if (lotsSnap.empty) {
      lotQ = query(collection(db, 'lots'), where('__name__', '==', id));
      lotsSnap = await getDocs(lotQ);
    }
    
    if (lotsSnap.empty) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const lotDoc = lotsSnap.docs[0];
    const lotData = lotDoc.data();
    
    if (lotData.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Lot already completed' });
    }
    
    // According to workflow, collector should confirm payment to complete
    if (lotData.status !== 'PAYMENT_PROCESSING' && lotData.status !== 'HANDOVER_CONFIRMED' && lotData.status !== 'RECYCLING_COMPLETED') {
      return res.status(400).json({ error: 'Lot is not in a valid state to be completed' });
    }
    
    const collectorId = lotData.collectorId;
    
    // Update lot status
    await updateDoc(doc(db, 'lots', lotDoc.id), {
      status: 'COMPLETED',
      'payment.status': 'PAID',
      'payment.processedAt': new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create LOT_COMPLETED event
    const eventRef = doc(collection(db, 'events'));
    const eventId = eventRef.id;
    await setDoc(eventRef, {
      id: eventId,
      eventType: 'LOT_COMPLETED',
      actorId: (req as any).user.userId,
      actorRole: (req as any).user.role,
      entityType: 'lot',
      entityId: lotDoc.id,
      timestamp: new Date().toISOString()
    });

    // Create PAYMENT_RECEIVED event
    const pEventRef = doc(collection(db, 'events'));
    await setDoc(pEventRef, {
      id: pEventRef.id,
      eventType: 'PAYMENT_RECEIVED',
      actorId: (req as any).user.userId,
      actorRole: (req as any).user.role,
      entityType: 'lot',
      entityId: lotDoc.id,
      timestamp: new Date().toISOString()
    });
    
    // Check if points already awarded for this lot (Idempotency check)
    const pointsQ = query(
      collection(db, 'points_transactions'), 
      where('referenceId', '==', lotDoc.id), 
      where('eventType', '==', 'LOT_COMPLETED')
    );
    const pointsSnap = await getDocs(pointsQ);
    
    let pointsAwarded = 0;
    
    if (pointsSnap.empty) {
      // Points Service
      pointsAwarded = 15; // Example rule: +15 for completed lot
      
      const ptRef = doc(collection(db, 'points_transactions'));
      await setDoc(ptRef, {
        id: ptRef.id,
        transactionId: `PT-${Date.now()}`,
        collectorId,
        points: pointsAwarded,
        eventType: 'LOT_COMPLETED',
        reason: 'Lot Successfully Completed',
        referenceId: lotDoc.id,
        createdAt: new Date().toISOString()
      });
      
      // Contribution Scoring Service
      // Simplified formula: Base 40 + (points / 50) + factor bonuses
      const userRef = doc(db, 'users', collectorId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() || {};
      
      const newPoints = (userData.points || 0) + pointsAwarded;
      
      // Calculate new score based on history
      // In a real system, we'd aggregate all successful handovers, complaints, etc.
      // Here we simulate an automatic score recalculation
      let baseScore = typeof userData.contributionScore === 'number' ? userData.contributionScore : 40;
      let newScore = Math.min(100, baseScore + 4); // Example rule: +4 score per completed lot up to 100
      
      // Update User
      await updateDoc(userRef, {
        points: newPoints,
        contributionScore: newScore
      });
      
      // Create Notification
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: collectorId,
        title: 'Lot Completed & Points Awarded',
        message: `Your lot ${lotData.lotId} was completed! You earned ${pointsAwarded} points. Your new score is ${newScore}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, pointsAwarded });
  } catch (error) {
    console.error('Complete lot error:', error);
    res.status(500).json({ error: 'Failed to complete lot' });
  }
});

app.post('/api/ai/identify', requireAuth(['collector']), async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI camera is not configured. Manual material entry remains available.' });
    if (typeof image !== 'string' || !image || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return res.status(400).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    const base64 = image.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'The image is invalid or too large. Choose an image under 6 MB.' });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: 'Identify the primary visible e-waste item. Return only the structured JSON schema. Use one canonical materialId from: pcb, copper, aluminium, cable, mobile, laptop, battery, other. Use other when uncertain or when no canonical mapping is safe. Do not estimate weight or price. Confidence must be between 0 and 1.' }
      ] }],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            materialName: { type: Type.STRING },
            materialId: { type: Type.STRING, nullable: true },
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ['materialName', 'category', 'confidence']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    const validIds = new Set(['pcb', 'copper', 'aluminium', 'cable', 'mobile', 'laptop', 'battery', 'other']);
    const confidence = Number(parsed.confidence);
    const materialId = parsed.materialId == null ? null : String(parsed.materialId).toLowerCase();
    if (typeof parsed.materialName !== 'string' || !parsed.materialName.trim() || typeof parsed.category !== 'string' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || (materialId !== null && !validIds.has(materialId))) {
      return res.status(422).json({ error: 'AI returned an invalid material result. Please choose the material manually.' });
    }
    res.json({ materialName: parsed.materialName.trim(), materialId, category: parsed.category.trim(), confidence });
  } catch (error) {
    console.error('AI image identification error:', error);
    res.status(502).json({ error: 'AI identification failed. Please retake the image or choose the material manually.' });
  }
});

app.post('/api/collector/material-reference-price', requireAuth(['collector']), async (req, res) => {
  try {
    const { materialName, location } = req.body;
    if (typeof materialName !== 'string' || materialName.trim().length < 2) {
      return res.status(400).json({ error: 'Enter a material name.' });
    }
    if (!location?.state) {
      return res.status(400).json({ error: 'Resolve the pickup location before checking a material price.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Price estimate unavailable — please verify the material.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Resolve this e-waste material and estimate a reasonable reference resale price in Indian rupees per kilogram. Use the supplied location region. Material entered by the collector: "${materialName.trim()}". Location state: "${location.state}". Return only JSON matching the response schema. Do not use zero or a price from an unrelated material. If the material cannot be priced responsibly, use referencePricePerKg 0 and confidence 0.`,
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            materialName: { type: Type.STRING },
            category: { type: Type.STRING },
            referencePricePerKg: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER }
          },
          required: ['materialName', 'category', 'referencePricePerKg', 'confidence']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    const price = Number(parsed.referencePricePerKg);
    const confidence = Number(parsed.confidence);
    if (!parsed.materialName || !parsed.category || !Number.isFinite(price) || !Number.isFinite(confidence) || price <= 0 || confidence < 0.5 || confidence > 1) {
      return res.status(422).json({ error: 'Price estimate unavailable — please verify the material.' });
    }
    res.json({ materialName: String(parsed.materialName).trim(), category: String(parsed.category).trim(), referencePricePerKg: price, confidence, region: location.state });
  } catch (error) {
    console.error('Custom material pricing error:', error);
    res.status(422).json({ error: 'Price estimate unavailable — please verify the material.' });
  }
});

setupChatEndpoint(app, db, requireAuth);
setupStatsEndpoints(app, db, requireAuth);

type IvrLanguage = 'en' | 'hi' | 'mr';
type IvrStep = 'menu' | 'price' | 'materials' | 'materialConfirm' | 'location' | 'locationConfirm' | 'schedule' | 'scheduleConfirm' | 'payment' | 'finalConfirm' | 'complete';
interface IvrSession {
  id: string;
  userId: string;
  mobile?: string;
  language: IvrLanguage;
  step: IvrStep;
  location?: any;
  materials: any[];
  pickupDate?: string;
  pickupTime?: string;
  paymentPreference?: 'CASH' | 'UPI';
  pendingLocation?: any;
  createdAt: string;
}

const ivrSessions = new Map<string, IvrSession>();
const ivrMode = process.env.IVR_MODE === 'LIVE' ? 'LIVE' : 'DEMO';
const ivrNumber = process.env.IVR_NUMBER || null;
interface IvrProviderAdapter {
  mode: 'DEMO' | 'LIVE';
  number: string | null;
  missedCallAction: 'DEMO_SESSION_READY' | 'CALLBACK_REQUIRED';
}
const ivrProvider: IvrProviderAdapter = {
  mode: ivrMode,
  number: ivrNumber,
  missedCallAction: ivrMode === 'LIVE' ? 'CALLBACK_REQUIRED' : 'DEMO_SESSION_READY'
};
const ivrPrompts: Record<IvrLanguage, Record<string, string>> = {
  en: { welcome: 'Welcome to RECYSETU. Press 1 for today’s e-waste price, 2 to sell e-waste or request pickup, 3 to track an existing pickup, 4 for help, or 9 to repeat the menu.', language: 'Press 1 for English, 2 for Hindi, or 3 for Marathi.', material: 'Tell me the material and weight, for example: 5 kilograms of mobile phones.', confirm: 'Press 1 if this is correct, or 2 to provide the details again.', location: 'Please say your city and state or full pickup address.', locationConfirm: 'I heard your pickup location as {location}. Press 1 to confirm or 2 to provide it again.', schedule: 'Please say your pickup date and time, for example tomorrow at 5 PM.', scheduleConfirm: 'I heard {schedule}. Press 1 to confirm or 2 to provide it again.', payment: 'How would you like to receive payment? Press 1 for Cash or 2 for UPI.', final: 'You are selling {materials}. Pickup location: {location}. Pickup: {schedule}. Payment: {payment}. Press 1 to confirm, 2 to change details, or 9 to repeat.', created: 'Your pickup request has been created. Your Lot ID is {lotId}. The handover OTP is {otp}. Please keep the OTP safe.', noLocation: 'I need your city and state before I can continue.', noPrice: 'A reference price is unavailable for this material. Please use the PWA to verify it.' },
  hi: { welcome: 'RECYSETU में आपका स्वागत है। आज की ई-वेस्ट कीमत के लिए 1, ई-वेस्ट बेचने या पिकअप के लिए 2, मौजूदा पिकअप ट्रैक करने के लिए 3, सहायता के लिए 4, या मेनू दोहराने के लिए 9 दबाएं।', language: 'अंग्रेज़ी के लिए 1, हिंदी के लिए 2, या मराठी के लिए 3 दबाएं।', material: 'सामग्री और वजन बताएं, जैसे: 5 किलो मोबाइल फोन।', confirm: 'सही होने पर 1 दबाएं, या जानकारी फिर से देने के लिए 2 दबाएं।', location: 'अपना शहर और राज्य या पूरा पिकअप पता बोलें।', locationConfirm: 'मैंने आपका पिकअप स्थान {location} सुना है। पुष्टि के लिए 1 या दोबारा बताने के लिए 2 दबाएं।', schedule: 'पिकअप की तारीख और समय बताएं, जैसे कल शाम 5 बजे।', scheduleConfirm: 'मैंने {schedule} सुना है। पुष्टि के लिए 1 या दोबारा बताने के लिए 2 दबाएं।', payment: 'भुगतान कैसे लेना चाहेंगे? नकद के लिए 1 या UPI के लिए 2 दबाएं।', final: 'आप बेच रहे हैं: {materials}. पिकअप स्थान: {location}. पिकअप: {schedule}. भुगतान: {payment}. पुष्टि के लिए 1, बदलने के लिए 2, या दोहराने के लिए 9 दबाएं।', created: 'आपका पिकअप अनुरोध बन गया है। आपका Lot ID {lotId} है। हैंडओवर OTP {otp} है। OTP सुरक्षित रखें।', noLocation: 'आगे बढ़ने से पहले शहर और राज्य बताना ज़रूरी है।', noPrice: 'इस सामग्री की संदर्भ कीमत उपलब्ध नहीं है। कृपया PWA में जांच करें।' },
  mr: { welcome: 'RECYSETU मध्ये आपले स्वागत आहे. आजच्या ई-वेस्ट किंमतीसाठी 1, ई-वेस्ट विक्री किंवा पिकअपसाठी 2, पिकअप ट्रॅक करण्यासाठी 3, मदतीसाठी 4, किंवा मेनू पुन्हा ऐकण्यासाठी 9 दाबा.', language: 'इंग्रजीसाठी 1, हिंदीसाठी 2, किंवा मराठीसाठी 3 दाबा.', material: 'साहित्य आणि वजन सांगा, उदाहरण: 5 किलो मोबाईल फोन.', confirm: 'बरोबर असल्यास 1 दाबा, किंवा पुन्हा माहिती देण्यासाठी 2 दाबा.', location: 'शहर आणि राज्य किंवा पूर्ण पिकअप पत्ता सांगा.', locationConfirm: 'मी तुमचे पिकअप ठिकाण {location} असे ऐकले. पुष्टीसाठी 1 किंवा पुन्हा सांगण्यासाठी 2 दाबा.', schedule: 'पिकअपची तारीख आणि वेळ सांगा, उदाहरण: उद्या संध्याकाळी 5 वाजता.', scheduleConfirm: 'मी {schedule} असे ऐकले. पुष्टीसाठी 1 किंवा पुन्हा सांगण्यासाठी 2 दाबा.', payment: 'पेमेंट कसे घ्याल? रोख रकमेसाठी 1 किंवा UPI साठी 2 दाबा.', final: 'तुम्ही विकत आहात: {materials}. पिकअप ठिकाण: {location}. पिकअप: {schedule}. पेमेंट: {payment}. पुष्टीसाठी 1, बदलण्यासाठी 2, किंवा 9 दाबा.', created: 'तुमची पिकअप विनंती तयार झाली. तुमचा Lot ID {lotId} आहे. हँडओव्हर OTP {otp} आहे. OTP सुरक्षित ठेवा.', noLocation: 'पुढे जाण्यासाठी शहर आणि राज्य आवश्यक आहे.', noPrice: 'या साहित्याची संदर्भ किंमत उपलब्ध नाही. कृपया PWA मध्ये तपासा.' }
};

function ivrPrompt(session: IvrSession, key: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), ivrPrompts[session.language][key] || 'Please try again.');
}

function ivrSessionResponse(session: IvrSession, prompt: string, extra: Record<string, any> = {}) {
  return { sessionId: session.id, mode: ivrMode, ivrNumber, language: session.language, step: session.step, prompt, ...extra };
}

async function getCollectorByMobile(mobile: string) {
  const normalized = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (normalized.length !== 10) return null;
  const result = await getDocs(query(collection(db, 'users'), where('mobile', '==', normalized)));
  return result.empty ? null : result.docs[0].data();
}

async function extractIvrInput(text: string, language: IvrLanguage) {
  if (!process.env.GEMINI_API_KEY) throw new Error('AI voice understanding is not configured. Please use keypad input or the PWA.');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Interpret this RECYSETU IVR caller statement in ${language}. Extract only what is present. Understand English, Hindi, Marathi, Hinglish, mixed and informal speech. Statement: "${text}"`,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          materials: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { materialName: { type: Type.STRING }, materialId: { type: Type.STRING, nullable: true }, weight: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ['materialName', 'weight', 'unit'] } },
          location: { type: Type.OBJECT, properties: { formattedAddress: { type: Type.STRING }, city: { type: Type.STRING }, state: { type: Type.STRING }, country: { type: Type.STRING } } },
          pickupDate: { type: Type.STRING },
          pickupTime: { type: Type.STRING }
        }
      }
    }
  });
  const parsed = JSON.parse(response.text || '{}');
  const validIds = new Set(MATERIAL_CATEGORIES.map(category => category.id));
  const materials = Array.isArray(parsed.materials) ? parsed.materials.slice(0, 5).filter(item => typeof item.materialName === 'string' && Number(item.weight) > 0).map(item => ({ materialName: item.materialName.trim(), materialId: validIds.has(String(item.materialId).toLowerCase()) ? String(item.materialId).toLowerCase() : 'other', declaredWeight: Number(item.weight), unit: 'kg' })) : [];
  return { materials, location: parsed.location?.formattedAddress || parsed.location?.city || parsed.location?.state ? parsed.location : undefined, pickupDate: parsed.pickupDate || undefined, pickupTime: parsed.pickupTime || undefined };
}

function ivrReferencePrice(materials: any[], state: string) {
  const priced = materials.map(item => {
    const currentPrice = getReferencePrice(item.materialId, state);
    const rate = currentPrice?.pricePerKg;
    return { ...item, materialCategory: currentPrice?.category || 'Other E-waste', estimatedRate: rate, estimatedValue: rate ? rate * item.declaredWeight : undefined };
  });
  if (priced.some(item => !item.estimatedRate)) return null;
  const total = priced.reduce((sum, item) => sum + item.estimatedValue, 0);
  const weight = priced.reduce((sum, item) => sum + item.declaredWeight, 0);
  return { items: priced, price: { rate: total / weight, total, source: 'Configured reference catalogue', region: state } };
}

async function ivrCurrentPickup(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'pickup_requests'), where('collectorId', '==', userId)));
  const pickups = snapshot.docs.map(item => item.data()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return pickups.find(item => !['CANCELLED', 'COMPLETED', 'PICKED_UP'].includes(item.status)) || pickups[0] || null;
}

async function ivrFinalize(session: IvrSession) {
  const token = jwt.sign({ userId: session.userId, role: 'collector' }, JWT_SECRET, { expiresIn: '2m' });
  const reference = ivrReferencePrice(session.materials, session.location.state);
  if (!reference) throw new Error(ivrPrompt(session, 'noPrice'));
  const response = await fetch(`http://127.0.0.1:${PORT}/api/collector/transactions/finalize`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `auth_token=${token}` }, body: JSON.stringify({ draftId: session.id, items: reference.items, location: session.location, pickupDate: session.pickupDate, pickupTime: session.pickupTime, paymentPreference: session.paymentPreference, referencePrice: reference.price, source: 'ivr', bookPickup: true }) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'The trusted transaction service rejected the request.');
  return data;
}

app.get('/api/ivr/config', (req, res) => res.json({ mode: ivrProvider.mode, number: ivrProvider.number, liveProviderConfigured: Boolean(process.env.IVR_PROVIDER && process.env.IVR_WEBHOOK_SECRET) }));

app.get('/api/collector/partners/nearby', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = (await getDoc(doc(db, 'users', userId))).data() || {};
    const location = user.location;
    if (!location?.latitude || !location?.longitude) return res.status(400).json({ error: 'Resolve your location before searching nearby partners.' });
    const partners = nearbyPartners(Number(location.latitude), Number(location.longitude), Number(req.query.radiusKm) || 25);
    res.json({ partners, source: 'DEMO_DIRECTORY', note: 'Demo records are clearly labelled and are not verified live businesses.' });
  } catch (error) {
    console.error('Nearby partner search error:', error);
    res.status(500).json({ error: 'Failed to find nearby partners.' });
  }
});

function calculateReferenceTotal(items: any[], state?: string) {
  return items.reduce((total, item) => {
    const price = getReferencePrice(String(item.materialId || ''), state);
    const rate = price?.pricePerKg ?? Number(item.estimatedRate);
    return total + (Number.isFinite(rate) ? rate * Number(item.declaredWeight || 0) : 0);
  }, 0);
}

app.post('/api/collector/partner-offers', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = (await getDoc(doc(db, 'users', userId))).data() || {};
    const lot = req.body.lot;
    const items = Array.isArray(lot?.items) ? lot.items : Array.isArray(req.body.items) ? req.body.items : [];
    let location = lot?.location || req.body.location || user.location || DEFAULT_DEMO_LOCATION;
    if (!items.length) return res.status(400).json({ error: 'Add at least one material before comparing partner offers.' });
    if (!location?.state || location.latitude == null || location.longitude == null) {
      const fallbackLocation = { ...DEFAULT_DEMO_LOCATION, ...location };
      if (!fallbackLocation?.state || fallbackLocation.latitude == null || fallbackLocation.longitude == null) {
        return res.status(400).json({ error: 'Your saved location must include state and coordinates.' });
      }
      location = fallbackLocation;
    }
    const referenceValue = Math.round(calculateReferenceTotal(items, location.state));
    const totalWeight = getTotalWeight(items);
    if (!referenceValue || !totalWeight) return res.status(400).json({ error: 'A valid reference value and total weight are required.' });
    const partners = nearbyPartners(Number(location.latitude), Number(location.longitude), 25);
    const offers = partners.map(partner => ({ partner: { ...partner, quotationEligible: partner.distanceKm <= 10 }, offer: calculatePartnerOffer(partner, referenceValue, totalWeight) }));
    res.json({ referenceValue, totalWeight, partners: offers });
  } catch (error) {
    console.error('Partner offers error:', error);
    res.status(500).json({ error: 'Failed to calculate partner offers.' });
  }
});

app.post('/api/ivr/demo/session', requireAuth(['collector']), async (req, res) => {
  const userId = (req as any).user.userId;
  const language: IvrLanguage = ['hi', 'mr'].includes(req.body.language) ? req.body.language : 'en';
  const session: IvrSession = { id: `ivr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId, language, step: 'menu', materials: [], createdAt: new Date().toISOString() };
  const user = await getDoc(doc(db, 'users', userId));
  session.location = user.data()?.location || undefined;
  ivrSessions.set(session.id, session);
  res.json(ivrSessionResponse(session, ivrPrompt(session, 'welcome')));
});

app.post('/api/ivr/demo/input', requireAuth(['collector']), async (req, res) => {
  try {
    const session = ivrSessions.get(req.body.sessionId);
    if (!session || session.userId !== (req as any).user.userId) return res.status(404).json({ error: 'IVR session not found.' });
    if (['en', 'hi', 'mr'].includes(req.body.language)) session.language = req.body.language;
    let input = String(req.body.input || '').trim();
    if (!input) return res.status(400).json({ error: 'Enter speech text or a keypad digit.' });
    if (session.step === 'menu') {
      const spoken = input.toLowerCase();
      if (!/^\d$/.test(input)) {
        if (spoken.includes('track') || spoken.includes('where is') || spoken.includes('कहां') || spoken.includes('कुठे')) input = '3';
        else if (spoken.includes('nearby') || spoken.includes('recycler') || spoken.includes('aggregator') || spoken.includes('पास') || spoken.includes('जवळ')) input = '4';
        else if (spoken.includes('price') || spoken.includes('rate') || spoken.includes('bhav') || spoken.includes('कीमत') || spoken.includes('किंमत')) input = '1';
        else if (spoken.includes('sell') || spoken.includes('pickup') || spoken.includes('बेच') || spoken.includes('विक') || spoken.includes('पिकअप')) input = '2';
      }
      if (input === '1') { session.step = 'price'; return res.json(ivrSessionResponse(session, 'Choose a category: 1 Laptop, 2 Mobile Phone, 3 Battery, 4 Other, 9 Repeat.')); }
      if (input === '2') { session.step = 'materials'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'material'))); }
      if (input === '3') { const pickup = await ivrCurrentPickup(session.userId); return res.json(ivrSessionResponse(session, pickup ? `Lot ${pickup.lotId || pickup.relatedLotId}. Partner ${pickup.partnerName || 'not assigned'}. Pickup ${pickup.preferredDate || 'not scheduled'} at ${pickup.preferredTime || 'not scheduled'}. Current status is ${String(pickup.status).replace(/_/g, ' ')}.` : 'No active pickup request yet.')); }
      if (input === '4') {
        const user = (await getDoc(doc(db, 'users', session.userId))).data() || {};
        const location = user.location;
        if (!location?.latitude || !location?.longitude) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'noLocation')));
        const partners = nearbyPartners(Number(location.latitude), Number(location.longitude), 25);
        return res.json(ivrSessionResponse(session, partners.length ? `Nearby ${partners.map(partner => `${partner.name}, ${partner.role.toLowerCase()}, ${partner.distanceKm} kilometres, ${partner.demo ? 'demo record' : 'verified'}`).join('; ')}.` : 'No eligible nearby partners were found.'));
      }
      if (input === '7') return res.json(ivrSessionResponse(session, 'You can speak naturally or use the keypad. Say price, sell, pickup, track, nearby partners, repeat, or cancel. Press 9 to repeat the menu.'));
      if (input === '9') return res.json(ivrSessionResponse(session, ivrPrompt(session, 'welcome')));
      return res.json(ivrSessionResponse(session, ivrPrompt(session, 'welcome')));
    }
    if (session.step === 'price') {
      const ids: Record<string, string> = { '1': 'laptop', '2': 'mobile', '3': 'battery' };
      if (input === '9') return res.json(ivrSessionResponse(session, 'Choose a category: 1 Laptop, 2 Mobile Phone, 3 Battery, 4 Other, 9 Repeat.'));
      const id = ids[input];
      if (input === '4' || !id) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'noPrice')));
      if (!session.location?.state) { session.pendingLocation = { materialId: id }; session.step = 'location'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'noLocation') + ' ' + ivrPrompt(session, 'location'))); }
      const category = MATERIAL_CATEGORIES.find(item => item.id === id)!;
      const currentPrice = getReferencePrice(id, session.location.state);
      session.step = 'menu';
      return res.json(ivrSessionResponse(session, `Today's reference price for ${category.name} in ${session.location.state} is approximately ₹${currentPrice?.min} to ₹${currentPrice?.max} per kilogram. This is an estimate, not a guaranteed offer. ${ivrPrompt(session, 'welcome')}`));
    }
    if (session.step === 'materials') {
      const parsed = await extractIvrInput(input, session.language);
      if (!parsed.materials.length) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'material')));
      session.materials = parsed.materials;
      if (parsed.location) session.pendingLocation = parsed.location;
      if (parsed.pickupDate) session.pickupDate = parsed.pickupDate;
      if (parsed.pickupTime) session.pickupTime = parsed.pickupTime;
      session.step = 'materialConfirm';
      const heard = session.materials.map(item => `${item.declaredWeight} kilograms of ${item.materialName}`).join(' and ');
      return res.json(ivrSessionResponse(session, `I heard ${heard}. ${ivrPrompt(session, 'confirm')}`));
    }
    if (session.step === 'materialConfirm') {
      if (input !== '1') { session.step = 'materials'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'material'))); }
      if (!session.pendingLocation && !session.location?.state) { session.step = 'location'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'location'))); }
      if (session.pendingLocation) { session.step = 'locationConfirm'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'locationConfirm', { location: session.pendingLocation.formattedAddress || `${session.pendingLocation.city || ''}, ${session.pendingLocation.state || ''}` }))); }
      session.step = session.pickupDate && session.pickupTime ? 'payment' : 'schedule';
      return res.json(ivrSessionResponse(session, session.step === 'payment' ? ivrPrompt(session, 'payment') : ivrPrompt(session, 'schedule')));
    }
    if (session.step === 'location') {
      const parsed = await extractIvrInput(input, session.language);
      if (!parsed.location) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'location')));
      const address = parsed.location.formattedAddress || [parsed.location.city, parsed.location.state].filter(Boolean).join(', ');
      const resolved = await forwardGeocode(address);
      if (!resolved.state) return res.json(ivrSessionResponse(session, 'I could not determine the state. Please say city and state again.'));
      session.pendingLocation = resolved; session.step = 'locationConfirm';
      return res.json(ivrSessionResponse(session, ivrPrompt(session, 'locationConfirm', { location: `${resolved.city || ''}, ${resolved.state}` }))); 
    }
    if (session.step === 'locationConfirm') {
      if (input !== '1') { session.step = 'location'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'location'))); }
      session.location = session.pendingLocation; session.pendingLocation = undefined;
      session.step = session.pickupDate && session.pickupTime ? 'payment' : 'schedule';
      return res.json(ivrSessionResponse(session, session.step === 'payment' ? ivrPrompt(session, 'payment') : ivrPrompt(session, 'schedule')));
    }
    if (session.step === 'schedule') {
      const parsed = await extractIvrInput(input, session.language);
      if (!parsed.pickupDate || !parsed.pickupTime) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'schedule')));
      session.pickupDate = parsed.pickupDate; session.pickupTime = parsed.pickupTime; session.step = 'scheduleConfirm';
      return res.json(ivrSessionResponse(session, ivrPrompt(session, 'scheduleConfirm', { schedule: `${session.pickupDate} at ${session.pickupTime}` })));
    }
    if (session.step === 'scheduleConfirm') {
      if (input !== '1') { session.step = 'schedule'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'schedule'))); }
      session.step = 'payment'; return res.json(ivrSessionResponse(session, ivrPrompt(session, 'payment')));
    }
    if (session.step === 'payment') {
      if (input !== '1' && input !== '2') return res.json(ivrSessionResponse(session, ivrPrompt(session, 'payment')));
      session.paymentPreference = input === '1' ? 'CASH' : 'UPI'; session.step = 'finalConfirm';
      const reference = ivrReferencePrice(session.materials, session.location.state);
      if (!reference) return res.json(ivrSessionResponse(session, ivrPrompt(session, 'noPrice')));
      const heard = session.materials.map(item => `${item.declaredWeight} kg ${item.materialName}`).join(', ');
      return res.json(ivrSessionResponse(session, ivrPrompt(session, 'final', { materials: heard, location: session.location.formattedAddress || `${session.location.city || ''}, ${session.location.state}`, schedule: `${session.pickupDate} at ${session.pickupTime}`, payment: session.paymentPreference }))); 
    }
    if (session.step === 'finalConfirm') {
      if (input !== '1') { session.step = 'menu'; return res.json(ivrSessionResponse(session, 'Details changed. ' + ivrPrompt(session, 'welcome'))); }
      const data = await ivrFinalize(session); session.step = 'complete';
      return res.json(ivrSessionResponse(session, ivrPrompt(session, 'created', { lotId: data.lot.lotId, otp: data.lot.handoverOtp }), { lotId: data.lot.lotId, handoverOtp: data.lot.handoverOtp, transaction: data }));
    }
    return res.json(ivrSessionResponse(session, ivrPrompt(session, 'welcome')));
  } catch (error: any) {
    console.error('IVR demo input error:', error);
    res.status(502).json({ error: error.message || 'IVR service failed. Please use keypad or the PWA.' });
  }
});

app.post('/api/ivr/provider/webhook', async (req, res) => {
  if (!process.env.IVR_WEBHOOK_SECRET || req.header('x-ivr-webhook-secret') !== process.env.IVR_WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized IVR provider webhook.' });
  const caller = await getCollectorByMobile(req.body.phoneNumber);
  if (!caller) return res.status(404).json({ mode: ivrMode, action: 'ONBOARDING_REQUIRED' });
  if (req.body.event === 'missed_call') return res.json({ mode: ivrProvider.mode, action: ivrProvider.missedCallAction, userId: caller.id, language: caller.preferredLanguage || 'en' });
  res.json({ mode: ivrProvider.mode, action: 'ROUTE_TO_IVR', userId: caller.id });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

function setupChatEndpoint(app, db, requireAuth) {
  // We'll initialize it lazily to handle cases where it might not be set initially
  let ai = null;

  app.post('/api/ai/chat', requireAuth(['collector']), async (req, res) => {
    try {
      if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
          return res.status(400).json({ error: 'AI service is not configured. Add the required Gemini API environment variable (GEMINI_API_KEY).' });
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      }

      const { message } = req.body;
      const userId = req.user.userId;

      // Define our tools for Gemini
      const findNearbyPartners = async (args) => {
        const { materialName } = args;
        const userDoc = await getDoc(doc(db, 'users', userId));
        const user = userDoc.data();
        const location = (user as any)?.location;
        if (!location?.latitude || !location?.longitude) return { material: materialName, error: 'Location is unresolved. Ask the collector for city and state.' };
        const price = getReferencePrice(findReferenceMaterial(String(materialName))?.id || String(materialName).toLowerCase(), location.state);
        const partners = nearbyPartners(Number(location.latitude), Number(location.longitude), 25);
        return {
           material: materialName,
          referencePrice: price,
          nearbyPartners: partners
        };
      };

      const getMaterialPrice = async (args) => {
        const { materialName } = args;
        const price = getReferencePrice(findReferenceMaterial(String(materialName))?.id || String(materialName).toLowerCase(), undefined);
        return price || { error: `No reliable reference price is configured for ${materialName}.` };
      };

      const createPickupRequest = async (args) => {
        return { draftOnly: true, message: `I have noted ${args.quantityKg} kg of ${args.materialName}. I will collect the remaining pickup details before creating anything.` };
      };

      const getUserData = async () => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        return `Your contribution score is ${userData?.contributionScore || 0}, and your RECYSETU points are ${userData?.points || 0}.`;
      };

const getPaymentStatus = async () => {        return 'Your last payment of ₹450 was processed on 5th September. Next payout is scheduled for Friday.';      };
      const getUserLots = async () => {
        const q = query(collection(db, 'lots'), where('collectorId', '==', userId));
        const snap = await getDocs(q);
        const lots = snap.docs.map(d => d.data());
        return `You have ${lots.length} lots. ${lots.filter(l => ['COMPLETED', 'RECYCLING_COMPLETED'].includes(l.status)).length} are completed.`;
      };

      const tools = [{
  functionDeclarations: [
    { name: "findNearbyPartners", description: "Get the current price for a material and a list of nearby partners based on the user's location.", parameters: { type: Type.OBJECT, properties: { materialName: { type: Type.STRING, description: "Name of the material to sell" } }, required: ["materialName"] } },
    { name: "getMaterialPrice", description: "Get the current rate/price for a specific recyclable material.", parameters: { type: Type.OBJECT, properties: { materialName: { type: Type.STRING, description: "Name of the material" } }, required: ["materialName"] } },
    { name: "createPickupRequest", description: "Book or request a pickup for recyclable materials.", parameters: { type: Type.OBJECT, properties: { materialName: { type: Type.STRING, description: "Name of the material" }, quantityKg: { type: Type.NUMBER, description: "Quantity in kilograms" } }, required: ["materialName", "quantityKg"] } },
    { name: "getUserData", description: "Get the user current RECYSETU points and contribution score.", parameters: { type: Type.OBJECT, properties: {} } },
    { name: "getUserLots", description: "Get information about the user lots and their statuses.", parameters: { type: Type.OBJECT, properties: {} } },
    { name: "getPaymentStatus", description: "Get information about the user payments and earnings.", parameters: { type: Type.OBJECT, properties: {} } }
  ]
}];
const chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: `You are the RECYSETU AI Assistant. You help informal waste collectors in India book pickups, check prices, and track their score. You must use tools to perform actions and fetch real data. You understand English, Hindi, Marathi, and Hinglish/transliterations. IMPORTANT: You MUST respond in the EXACT same language that the user used. If they write in Hindi, reply in Hindi. If they write in Marathi, reply in Marathi. If they write in transliterated Hindi (Hinglish), reply in Hindi or Hinglish.
CRITICAL SELLING WORKFLOW: When a collector says they want to sell a material, you MUST FIRST use 'findNearbyPartners' to get the current price for that material AND find nearby aggregators/recyclers matching their location. Then, tell them the price and present the nearby options (with their distances and offered prices). Ask if they want to go drop it off themselves or if they want to schedule a pickup. ONLY create a pickup request if they explicitly confirm they want a pickup scheduled. Be helpful, concise, and polite.`,
    tools: tools,
    temperature: 0.1
  }
});
const response = await chat.sendMessage({ message });
      
      let finalReply = response.text;

      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const calls = response.functionCalls;
        const functionResponses = [];
        
        for (const call of calls) {
          try {
            let result;
            if (call.name === 'getMaterialPrice') result = await getMaterialPrice(call.args);
            else if (call.name === 'findNearbyPartners') result = await findNearbyPartners(call.args);
            else if (call.name === 'createPickupRequest') result = await createPickupRequest(call.args);
            else if (call.name === 'getUserData') result = await getUserData();
else if (call.name === 'getPaymentStatus') result = await getPaymentStatus();
            else if (call.name === 'getUserLots') result = await getUserLots();
            
            functionResponses.push({
              functionResponse: {
              name: call.name,
              response: { result }
              }
            });
          } catch (e) {
            functionResponses.push({
              functionResponse: {
              name: call.name,
              response: { error: e.message }
              }
            });
          }
        }
        
        const finalResponse = await chat.sendMessage({ message: functionResponses });
        finalReply = finalResponse.text;
      }

      res.json({ reply: finalReply });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'AI service request failed.' });
    }
  });
}
function setupStatsEndpoints(app, db, requireAuth) {

  app.get('/api/admin/stats', requireAuth(['admin']), async (req, res) => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const lotsSnap = await getDocs(collection(db, 'lots'));
      const pickupsSnap = await getDocs(collection(db, 'pickup_requests'));

      const lots = lotsSnap.docs.map(d => d.data());
      const completedLots = lots.filter(l => ['COMPLETED', 'RECYCLING_COMPLETED'].includes(l.status)).length;

      res.json({
        totalUsers: usersSnap.size,
        totalLots: lots.length,
        totalPickups: pickupsSnap.size,
        completedLots: completedLots,
        attention: {
          weightDiscrepancies: 5,
          recyclerVerifications: lots.filter(l => l.status === 'PENDING_HANDOVER').length,
          complaints: 0
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/aggregator/stats', requireAuth(['aggregator']), async (req, res) => {
    try {
      const p1 = await getDocs(query(collection(db, 'pickup_requests'), where('status', '==', 'PENDING')));
      const p2 = await getDocs(query(collection(db, 'pickup_requests'), where('status', '==', 'ACCEPTED'), where('assignedTo', '==', req.user.userId)));
      
      res.json({
        incomingRequests: p1.size,
        activePickups: p2.size,
        collectors: 21,
        pendingHandovers: 0
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/recycler/stats', requireAuth(['recycler']), async (req, res) => {
    try {
      const lotsSnap = await getDocs(collection(db, 'lots'));
      const lots = lotsSnap.docs.map(d => d.data());
      
      res.json({
        awaitingVerification: lots.filter(l => l.status === 'PENDING_HANDOVER').length,
        processing: lots.filter(l => ['PAYMENT_PROCESSING', 'PROCESSING'].includes(l.status)).length,
        completedLots: lots.filter(l => ['COMPLETED', 'RECYCLING_COMPLETED'].includes(l.status)).length,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });
}

app.get('/api/collector/earnings', requireAuth(['collector']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const q = query(collection(db, 'earnings_transactions'), where('collectorId', '==', userId));
    const snap = await getDocs(q);
    const transactions = snap.docs.map(d => d.data());
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Also fetch the user doc for total earnings
    const userDoc = await getDoc(doc(db, 'users', userId));
    const totalEarnings = userDoc.data()?.totalEarnings || 0;

    res.json({ transactions, totalEarnings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Route deleted to avoid duplicate lot creation and use /api/collector/lots instead
