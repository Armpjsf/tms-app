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
  if (!address || address.length < 3) return null;

  try {
    // Nominatim requires a descriptive User-Agent
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TMS-2026-Logistics-App (contact@yourdomain.com)' 
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
