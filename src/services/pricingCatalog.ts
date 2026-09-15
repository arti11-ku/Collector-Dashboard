export interface ReferenceMaterial {
  id: string;
  name: string;
  category: string;
  baseRate: number;
  note?: string;
}

export const REFERENCE_MATERIALS: ReferenceMaterial[] = [
  { id: 'mobile', name: 'Mobile Phone', category: 'Phones and Small Electronics', baseRate: 1000 },
  { id: 'laptop', name: 'Laptop', category: 'Computer Equipment', baseRate: 800 },
  { id: 'desktop', name: 'Desktop Computer', category: 'Computer Equipment', baseRate: 650 },
  { id: 'tablet', name: 'Tablet', category: 'Phones and Small Electronics', baseRate: 850 },
  { id: 'led-tv', name: 'Television', category: 'TV and Home Electronics', baseRate: 450 },
  { id: 'monitor', name: 'Monitor', category: 'Computer Equipment', baseRate: 500 },
  { id: 'printer', name: 'Printer', category: 'Computer Equipment', baseRate: 350 },
  { id: 'router', name: 'Router / Modem', category: 'Phones and Small Electronics', baseRate: 350 },
  { id: 'battery', name: 'Batteries', category: 'Power and Batteries', baseRate: 90 },
  { id: 'cable', name: 'Cables', category: 'Cables and Metals', baseRate: 80 },
  { id: 'other', name: 'Other', category: 'Other E-waste', baseRate: 50 }
];

export function findReferenceMaterial(input: string) {
  const query = input.trim().toLowerCase();
  return REFERENCE_MATERIALS.find(item => item.id === query || item.name.toLowerCase() === query || item.name.toLowerCase().includes(query));
}

export function referencePrice(materialId: string, state?: string) {
  const material = REFERENCE_MATERIALS.find(item => item.id === materialId);
  if (!material) return null;
  const stateAdjustment = state?.toLowerCase() === 'maharashtra' ? 1.02 : 1;
  const rate = Math.round(material.baseRate * stateAdjustment);
  return { materialName: material.name, category: material.category, pricePerKg: rate, min: Math.round(rate * 0.9), max: Math.round(rate * 1.1), source: 'Configured reference catalogue', region: state || 'Unresolved', updatedAt: new Date().toISOString(), note: 'Reference estimate only; final value depends on condition and partner offer.' };
}
