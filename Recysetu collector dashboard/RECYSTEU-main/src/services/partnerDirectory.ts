export interface PartnerRecord {
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
  serviceRadiusKm: number;
  active: boolean;
  demo: boolean;
}

export interface PartnerOffer {
  offerId: string;
  partnerId: string;
  pricePerKg: number;
  grossMaterialValue: number;
  adjustmentAmount: number;
  transportCharge: number;
  processingCharge: number;
  feasibilityCharge: number;
  handlingCharge: number;
  otherCharge: number;
  finalNetPayout: number;
  sourceType: 'CURRENT_REFERENCE';
  status: 'VALID';
  createdAt: string;
  validUntil: string;
}

export const DEMO_PARTNERS: PartnerRecord[] = [
  { partnerId: 'demo-ecohub', name: 'EcoHub Aggregators', role: 'AGGREGATOR', phone: '+91 90000 10001', address: 'KRIPAL NAGAR KOHKA BHILAI, Bhilai, Durg Tahsil, Durg, Chhattisgarh, 490001, India', locality: 'Kohka', city: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', pincode: '490001', latitude: 21.1938, longitude: 81.3509, serviceRadiusKm: 25, active: true, demo: true },
  { partnerId: 'demo-greenloop', name: 'GreenLoop E-Waste Aggregators', role: 'AGGREGATOR', phone: '+91 90000 10002', address: 'Industrial Area, Bhilai, Durg, Chhattisgarh, 490001, India', city: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', pincode: '490001', latitude: 21.205, longitude: 81.34, serviceRadiusKm: 20, active: true, demo: true },
  { partnerId: 'demo-circular', name: 'Bhilai Circular Recycler', role: 'RECYCLER', phone: '+91 90000 10003', address: 'Sector 6 Recycling Zone, Bhilai, Durg, Chhattisgarh, 490006, India', city: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', pincode: '490006', latitude: 21.21, longitude: 81.33, serviceRadiusKm: 25, active: true, demo: true },
  { partnerId: 'demo-recycletech', name: 'ReCycleTech E-Waste Recycler', role: 'RECYCLER', phone: '+91 90000 10004', address: 'Kohka Circular Materials Park, Bhilai, Durg, Chhattisgarh, 490023, India', city: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', pincode: '490023', latitude: 21.18, longitude: 81.36, serviceRadiusKm: 30, active: true, demo: true }
];

export function distanceKm(latitude1: number, longitude1: number, latitude2: number, longitude2: number) {
  const earthRadius = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearbyPartners(latitude: number, longitude: number, radiusKm = 25) {
  return DEMO_PARTNERS.filter(partner => partner.active).map(partner => ({ ...partner, distanceKm: Number(distanceKm(latitude, longitude, partner.latitude, partner.longitude).toFixed(2)) })).filter(partner => partner.distanceKm <= Math.min(radiusKm, partner.serviceRadiusKm)).sort((a, b) => a.distanceKm - b.distanceKm);
}

const OFFER_MODELS: Record<string, { adjustmentRate: number; transportRate: number; processingRate: number; feasibilityRate: number; handlingRate: number; otherRate: number }> = {
  'demo-ecohub': { adjustmentRate: 0.08, transportRate: 0.018, processingRate: 0.012, feasibilityRate: 0.006, handlingRate: 0.014, otherRate: 0.004 },
  'demo-greenloop': { adjustmentRate: 0.05, transportRate: 0.014, processingRate: 0.018, feasibilityRate: 0.004, handlingRate: 0.012, otherRate: 0.006 },
  'demo-circular': { adjustmentRate: 0.1, transportRate: 0.022, processingRate: 0.01, feasibilityRate: 0.008, handlingRate: 0.016, otherRate: 0.003 },
  'demo-recycletech': { adjustmentRate: 0.03, transportRate: 0.012, processingRate: 0.02, feasibilityRate: 0.005, handlingRate: 0.01, otherRate: 0.008 }
};

export function calculatePartnerOffer(partner: PartnerRecord, referenceValue: number, totalWeight: number, now = new Date()): PartnerOffer {
  const model = OFFER_MODELS[partner.partnerId] || { adjustmentRate: 0, transportRate: 0.02, processingRate: 0.015, feasibilityRate: 0.005, handlingRate: 0.012, otherRate: 0.005 };
  const pricePerKg = totalWeight > 0 ? Math.round(referenceValue / totalWeight) : 0;
  const adjustmentAmount = Math.round(referenceValue * model.adjustmentRate);
  const transportCharge = Math.round(referenceValue * model.transportRate);
  const processingCharge = Math.round(referenceValue * model.processingRate);
  const feasibilityCharge = Math.round(referenceValue * model.feasibilityRate);
  const handlingCharge = Math.round(referenceValue * model.handlingRate);
  const otherCharge = Math.round(referenceValue * model.otherRate);
  const finalNetPayout = Math.max(0, referenceValue + adjustmentAmount - transportCharge - processingCharge - feasibilityCharge - handlingCharge - otherCharge);
  return {
    offerId: `reference-${partner.partnerId}-${now.getTime()}`,
    partnerId: partner.partnerId,
    pricePerKg,
    grossMaterialValue: referenceValue,
    adjustmentAmount,
    transportCharge,
    processingCharge,
    feasibilityCharge,
    handlingCharge,
    otherCharge,
    finalNetPayout,
    sourceType: 'CURRENT_REFERENCE',
    status: 'VALID',
    createdAt: now.toISOString(),
    validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  };
}
