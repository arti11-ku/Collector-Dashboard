import type { ResolvedLocation } from '../context/TransactionDraftContext';

interface GeocodeResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string | undefined>;
}

function toLocation(data: GeocodeResult): ResolvedLocation {
  const address = data.address || {};
  return {
    formattedAddress: data.display_name || '',
    locality: address.suburb || address.neighbourhood || address.village,
    landmark: address.amenity || address.building,
    ward: address.ward,
    city: address.city || address.town || address.village || address.municipality,
    district: address.county || address.state_district,
    state: address.state,
    country: address.country,
    pincode: address.postcode,
    latitude: data.lat ? Number(data.lat) : undefined,
    longitude: data.lon ? Number(data.lon) : undefined
  };
}

async function geocode(url: string): Promise<ResolvedLocation> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Location service could not resolve this address.');
  const results = await response.json() as GeocodeResult[] | GeocodeResult;
  const result = Array.isArray(results) ? results[0] : results;
  if (!result?.display_name) throw new Error('Please enter a more specific address including city and state.');
  return toLocation(result);
}

export async function reverseGeocode(latitude: number, longitude: number) {
  return geocode(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
}

export async function forwardGeocode(address: string) {
  if (!address.trim()) throw new Error('Please enter an address.');
  return geocode(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=in&q=${encodeURIComponent(address)}`);
}

export function locationLabel(location?: ResolvedLocation) {
  if (!location) return '';
  return [location.city, location.state].filter(Boolean).join(', ') || location.formattedAddress;
}
