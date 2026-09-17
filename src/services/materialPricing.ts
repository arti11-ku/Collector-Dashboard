import { ResolvedLocation } from '../context/TransactionDraftContext';

export interface CustomMaterialPrice {
  materialName: string;
  category: string;
  referencePricePerKg: number;
  confidence: number;
  region: string;
}

export async function resolveCustomMaterialPrice(materialName: string, location: ResolvedLocation): Promise<CustomMaterialPrice> {
  const response = await fetch('/api/collector/material-reference-price', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materialName, location })
  });
  const data = await response.json();
  if (!response.ok || !data.materialName || !Number.isFinite(Number(data.referencePricePerKg))) {
    throw new Error(data.error || 'Price estimate unavailable — please verify the material.');
  }
  return {
    materialName: String(data.materialName),
    category: String(data.category),
    referencePricePerKg: Number(data.referencePricePerKg),
    confidence: Number(data.confidence),
    region: String(data.region)
  };
}
