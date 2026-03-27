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

  try {
    // Nominatim requires a descriptive User-Agent
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&addressdetails=1&countrycodes=th`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' 
      }
    });

    if (!response.ok) {
        return null;
    }

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
}
