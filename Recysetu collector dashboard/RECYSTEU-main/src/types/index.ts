export type Role = 'collector' | 'aggregator' | 'recycler' | 'admin';

export interface User {
  id: string;
  role: Role;
  name: string;
  mobile?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  location?: {
    formattedAddress: string;
    locality?: string;
    landmark?: string;
    ward?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  preferredLanguage: string;
  profileCompleted?: boolean;
  points?: number;
  contributionScore?: number | string;
  totalEarnings?: number;
  createdAt?: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OTPRequest {
  id: string;
  mobile: string;
  otpHash: string; // Stored in DB
  expiresAt: string;
  attempts: number;
  status: 'pending' | 'verified' | 'expired' | 'failed';
}

export interface LotItem {
  id?: string; // Optional if using array
  materialId: string;
  materialName?: string;
  materialCategory?: string;
  declaredWeight: number;
  unit: string;
  estimatedRate?: number;
  estimatedValue?: number;
  pricingConfidence?: number;
}

export type LotStatus = 'PENDING_HANDOVER' | 'HANDOVER_CONFIRMED' | 'PAYMENT_PROCESSING' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI';

export interface PaymentInfo {
  preference: PaymentMethod;
  status: 'PENDING' | 'PAID' | 'FAILED';
  amount?: number;
  upiId?: string; // usually registered mobile
  processedAt?: string;
}

export interface Lot {
  id: string;
  lotId: string;
  collectorId: string;
  
  // Backward compatibility fields
  material?: string;
  quantity?: number;
  unit?: string;
  
  // New multi-material support
  items?: LotItem[];
  
  // Partner assignment
  assignedPartnerId?: string;
  assignedPartnerType?: 'aggregator' | 'recycler';
  
  // Link to pickup
  pickupRequestId?: string;
  draftId?: string;
  partnerName?: string;
  partnerAddress?: string;
  agreedAmount?: number;
  totalWeight?: number;
  pickupFee?: number;
  pickupEligibility?: 'BELOW_MINIMUM' | 'STANDARD' | 'FREE';
  cancelledAt?: string;
  
  // Status machine
  status: LotStatus | string; // allowing string for backward compatibility
  
  // QR & OTP foundation
  qrToken?: string;
  handoverOtp?: string;
  verificationState?: 'PENDING' | 'VERIFIED' | 'FAILED';
  
  // Payment info
  payment?: PaymentInfo;
  
  createdAt: string;
  updatedAt?: string;
  location?: User['location'];
  referencePrice?: { rate: number; total: number; source: string; region: string; updatedAt?: string };
}

export interface PickupRequest {
  id: string;
  requestId: string;
  collectorId: string;
  assignedPartnerId?: string;
  assignedPartnerType?: 'aggregator' | 'recycler';
  location?: string;
  preferredDate?: string;
  preferredTime?: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'ACCEPTED' | 'PICKED_UP' | 'CANCELLED' | string;
  relatedLotId?: string; // Link to the lot
  lotId?: string;
  partnerName?: string;
  partnerAddress?: string;
  paymentPreference?: PaymentMethod;
  pickupFee?: number;
  totalWeight?: number;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  recipientRole: Role;
  title: string;
  message: string;
  notificationType: string;
  relatedLotId?: string;
  relatedPickupId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Partner {
  partnerId: string;
  name: string;
  role: 'AGGREGATOR' | 'RECYCLER';
  phone: string;
  address: string;
  locality?: string;
  landmark?: string;
  ward?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  serviceRadiusKm: number;
  active: boolean;
  demo: boolean;
}

export interface QuotationRequest {
  quotationRequestId: string;
  lotId: string;
  collectorId: string;
  partnerId: string;
  materialSnapshot: LotItem[];
  totalWeight: number;
  estimatedValue?: number;
  locationSnapshot?: User['location'];
  message?: string;
  requestedAt: string;
  status: 'SENT' | 'VIEWED' | 'QUOTED' | 'DECLINED' | 'EXPIRED' | string;
  expiresAt?: string;
}

export interface TraceabilityEvent {
  id: string;
  eventType: 'LOT_CREATED' | 'PARTNER_SELECTED' | 'PICKUP_SCHEDULED' | 'HANDOVER_CONFIRMED' | 'PAYMENT_PROCESSING' | 'PAYMENT_RECEIVED' | 'LOT_COMPLETED' | string;
  actorId: string;
  actorRole: string;
  entityType: 'lot' | 'pickup_request' | string;
  entityId: string;
  metadata?: any;
  timestamp: string;
}

export { REFERENCE_MATERIALS as MATERIAL_CATEGORIES } from '../services/pricingCatalog';
