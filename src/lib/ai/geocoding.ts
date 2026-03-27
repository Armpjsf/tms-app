"use server"

/**
 * Geocoding Utility — TMS 2026
 * Using Nominatim (OpenStreetMap) to convert addresses to coordinates.
 * Respects Nominatim Usage Policy (Rate limiting, User-Agent).
 */

export type GeocodeResult = {
  lat: number
  lng: number
  display_name: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const cleanAddress = address.trim().replace(/\s+/g, ' ');
  if (!cleanAddress || cleanAddress.length < 2) return null;

  const performSearch = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=th`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' 
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1. Try full address
  let result = await performSearch(cleanAddress);
  if (result) return result;

  // 2. Smart Cleanup: Strip common Thai business/org prefixes that might confuse global search
  const prefixes = ['บริษัท', 'ห้างหุ้นส่วน', 'บมจ.', 'หจก.', 'โรงงาน', 'คลังสินค้า', 'สำนักงาน'];
  let strippedAddress = cleanAddress;
  for (const p of prefixes) {
    if (strippedAddress.startsWith(p)) {
      strippedAddress = strippedAddress.replace(p, '').trim();
      break;
    }
  }
  
  if (strippedAddress !== cleanAddress) {
    result = await performSearch(strippedAddress);
    if (result) return result;
  }

  // 3. Fallback: Last resort - try finding the district and province parts
  // Very simple split by space, take the last 2-3 tokens which are usually address details
  const parts = cleanAddress.split(' ');
  if (parts.length > 2) {
    const fallbackQuery = parts.slice(-2).join(' '); // Usually [District, Province]
    result = await performSearch(fallbackQuery);
    if (result) return result;
  }

  return null;
}
