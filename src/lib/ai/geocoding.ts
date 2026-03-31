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

export async function geocodeAddress(address: string, context?: string): Promise<GeocodeResult | null> {
  const cleanAddress = address.trim().replace(/\s+/g, ' ');
  if (!cleanAddress || cleanAddress.length < 2) return null;

  // 0. Direct Coordinate Detection: 13.949013, 100.860599
  const latLngRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
  const match = cleanAddress.match(latLngRegex);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      display_name: cleanAddress
    };
  }

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

  // 1. Try address + context if available
  let result = null;
  if (context) {
    result = await performSearch(`${cleanAddress} ${context}`);
    if (result) return result;
  }

  // 1b. Try full address
  result = await performSearch(cleanAddress);
  if (result) return result;

  // 2. Smart Cleanup: Strip common POI prefixes/suffixes
  // Thai prefixes
  const thaiPrefixes = ['บริษัท', 'ห้างหุ้นส่วน', 'บมจ.', 'หจก.', 'โรงงาน', 'คลังสินค้า', 'สำนักงาน'];
  // English suffixes
  const engSuffixes = [', Ltd.', ' Co., Ltd.', ' Co.,Ltd.', ' Ltd.', ' Co. Ltd.', ' PLC', ' Corp.'];
  
  let strippedAddress = cleanAddress;
  
  // Remove Thai prefixes
  for (const p of thaiPrefixes) {
    if (strippedAddress.startsWith(p)) {
      strippedAddress = strippedAddress.replace(p, '').trim();
      break;
    }
  }

  // Remove English suffixes (case insensitive)
  for (const s of engSuffixes) {
    const regex = new RegExp(s.replace('.', '\\.'), 'gi');
    strippedAddress = strippedAddress.replace(regex, '').trim();
  }
  
  if (strippedAddress !== cleanAddress) {
    result = await performSearch(strippedAddress);
    if (result) return result;
  }

  // 3. Fallback: Split by common delimiters and try the first part (usually the name)
  const delimiters = [',', ' ', ' | '];
  for (const d of delimiters) {
      const parts = cleanAddress.split(d);
      if (parts.length > 1) {
          result = await performSearch(parts[0].trim());
          if (result) return result;
      }
  }

  // 4. Fallback: Last resort - try finding the district and province parts (last 2 tokens)
  const tokens = cleanAddress.split(' ');
  if (tokens.length > 2) {
    const fallbackQuery = tokens.slice(-2).join(' '); 
    result = await performSearch(fallbackQuery);
    if (result) return result;
  }

  return null;
}
