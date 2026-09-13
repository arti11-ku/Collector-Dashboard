export type PickupTier = 'BELOW_MINIMUM' | 'STANDARD' | 'FREE';

export const PICKUP_FEES = {
  belowMinimum: 50,
  standard: 20
} as const;

export interface PickupRule {
  tier: PickupTier;
  eligible: true;
  totalWeight: number;
  fee: number;
  label: string;
}

export function getPickupRule(totalWeight: number): PickupRule {
  const normalizedWeight = Math.max(0, Number(totalWeight) || 0);
  if (normalizedWeight < 10) {
    return { tier: 'BELOW_MINIMUM', eligible: true, totalWeight: normalizedWeight, fee: PICKUP_FEES.belowMinimum, label: 'Pickup available with an additional pickup charge.' };
  }
  if (normalizedWeight < 25) {
    return { tier: 'STANDARD', eligible: true, totalWeight: normalizedWeight, fee: PICKUP_FEES.standard, label: 'Low pickup charge applicable.' };
  }
  return { tier: 'FREE', eligible: true, totalWeight: normalizedWeight, fee: 0, label: 'FREE PICKUP' };
}

export function getTotalWeight(items: Array<{ declaredWeight?: number }>) {
  return items.reduce((total, item) => total + (Number(item.declaredWeight) || 0), 0);
}
