"use server"

/**
 * Geocoding & AI Location Search Utility — TMS 2026
 * - Direct coordinate parsing (lat, lng)
 * - Google Maps URL resolver (including maps.app.goo.gl short links)
 * - AI-powered location search via Google Gemini (finds companies, factories, POIs in Thailand)
 * - OpenStreetMap / Nominatim fallback
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

export type GeocodeResult = {
  lat: number
  lng: number
  display_name: string
  source?: 'coordinate' | 'google_maps' | 'ai' | 'osm'
}

export type AILocationResult = {
  name: string
  address: string
  lat: number
  lng: number
  source: 'ai' | 'coordinate' | 'google_maps'
}

/**
 * Resolves a Google Maps URL (including short links like maps.app.goo.gl)
 * into precise Latitude, Longitude, and place name.
 */
export async function resolveGoogleMapsUrl(url: string): Promise<{ lat: number; lng: number; name?: string } | null> {
  if (!url || !url.trim().startsWith('http')) return null;
  const cleanUrl = url.trim();

  // 1. Direct Regex checks on URL string
  const latLngAt = cleanUrl.match(/@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (latLngAt) {
    return { lat: parseFloat(latLngAt[1]), lng: parseFloat(latLngAt[2]) };
  }

  const m3d = cleanUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m3d) {
    return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };
  }

  const queryMatch = cleanUrl.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
  }

  // 2. If it's a short URL (maps.app.goo.gl or goo.gl/maps), fetch redirect destination
  if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('goo.gl/maps') || cleanUrl.includes('maps.google.com') || cleanUrl.includes('google.com/maps')) {
    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(6000)
      });

      const finalUrl = response.url || '';
      
      // Try regex on final redirected URL
      const finalAt = finalUrl.match(/@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (finalAt) return { lat: parseFloat(finalAt[1]), lng: parseFloat(finalAt[2]) };

      const final3d = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (final3d) return { lat: parseFloat(final3d[1]), lng: parseFloat(final3d[2]) };

      const finalQuery = finalUrl.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (finalQuery) return { lat: parseFloat(finalQuery[1]), lng: parseFloat(finalQuery[2]) };

      // Try parsing HTML content for coordinates / meta tags
      const html = await response.text();
      const metaMatch = html.match(/content="https:\/\/maps\.google\.com\/maps\/api\/staticmap\?[^"]*center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) 
                     || html.match(/itemprop="latitude"\s+content="(-?\d+\.\d+)"[\s\S]*?itemprop="longitude"\s+content="(-?\d+\.\d+)"/i)
                     || html.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+),/);

      if (metaMatch) {
        return { lat: parseFloat(metaMatch[1]), lng: parseFloat(metaMatch[2]) };
      }
    } catch (err) {
      console.warn('[resolveGoogleMapsUrl] Follow redirect error:', err);
    }
  }

  return null;
}

/**
 * Searches real-world locations in Thailand using Google Gemini AI.
 * Solves the issue where OpenStreetMap lacks Thai company/factory/POI data.
 */
export async function searchLocationWithAI(query: string): Promise<AILocationResult[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  // 1. Check if user typed coordinates directly: "13.528431, 100.672911"
  const coordMatch = clean.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= 5.5 && lat <= 20.6 && lng >= 97.3 && lng <= 105.7) {
      return [{
        name: `พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        address: `ละติจูด ${lat.toFixed(6)}, ลองจิจูด ${lng.toFixed(6)}`,
        lat,
        lng,
        source: 'coordinate'
      }];
    }
  }

  // 2. Check if user pasted a Google Maps URL
  if (clean.startsWith('http') && (clean.includes('maps') || clean.includes('goo.gl'))) {
    const resolved = await resolveGoogleMapsUrl(clean);
    if (resolved) {
      return [{
        name: resolved.name || 'ตำแหน่งจากลิงก์ Google Maps',
        address: `พิกัด ${resolved.lat.toFixed(6)}, ${resolved.lng.toFixed(6)}`,
        lat: resolved.lat,
        lng: resolved.lng,
        source: 'google_maps'
      }];
    }
  }

  // 3. AI POI Search with Gemini
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[searchLocationWithAI] No Gemini API key found');
    return [];
  }

  const modelCandidates = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest"
  ];

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
You are an expert Thailand Logistics and Geolocation Specialist.
The user is searching for a business, company, factory, industrial estate, warehouse, branch, or landmark in Thailand for the query: "${clean}".

Find up to 4 most accurate real-world locations in Thailand matching this query.
For example, if the query is "formica", you should find "บริษัท ฟอร์ไมก้า (ประเทศไทย) จำกัด" (such as Bangpoo Industrial Estate Samut Prakan, Muang Thong Thani office, etc.).

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "name": "ชื่อสถานที่/บริษัท พร้อมระบุสาขาหรือนิคมฯ ในไทย เช่น บริษัท ฟอร์ไมก้า (ประเทศไทย) จำกัด (โรงงานบางปู)",
    "address": "ที่อยู่ภาษาไทยแบบเต็ม (ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)",
    "lat": 13.5284,
    "lng": 100.6729
  }
]

CRITICAL RULES:
- Only return places in Thailand (Latitude: 5.5 to 20.6, Longitude: 97.3 to 105.7).
- Make Latitude and Longitude as precise as possible for the actual site/branch.
- Do NOT output any markdown formatting, explanation, or backticks other than the raw JSON array.
`.trim();

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();
      const cleanedJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed = JSON.parse(cleanedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const results: AILocationResult[] = [];
        for (const item of parsed) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lng);
          // Thailand bounding box verification
          if (!isNaN(lat) && !isNaN(lng) && lat >= 5.5 && lat <= 20.6 && lng >= 97.3 && lng <= 105.7) {
            results.push({
              name: item.name || clean,
              address: item.address || '',
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              source: 'ai'
            });
          }
        }
        if (results.length > 0) {
          return results;
        }
      }
    } catch (err) {
      console.warn(`[searchLocationWithAI] Error with model ${modelName}:`, err);
      // Try next candidate
    }
  }

  return [];
}

/**
 * Standard geocodeAddress function used across the app (Create Job, Routes, etc.).
 * Combines Direct Coordinates, Google Maps URLs, OpenStreetMap, and Gemini AI.
 */
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
      display_name: cleanAddress,
      source: 'coordinate'
    };
  }

  // 0.1 Google Maps URL Detection
  if (cleanAddress.startsWith('http') && (cleanAddress.includes('maps') || cleanAddress.includes('goo.gl'))) {
    const resolved = await resolveGoogleMapsUrl(cleanAddress);
    if (resolved) {
      return {
        lat: resolved.lat,
        lng: resolved.lng,
        display_name: resolved.name || `พิกัด ${resolved.lat.toFixed(6)}, ${resolved.lng.toFixed(6)}`,
        source: 'google_maps'
      };
    }
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const performSearch = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=th`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' 
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.status === 429) {
        return 'rate-limited';
      }

      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const first = data[0];
        
        // Reject broad administrative matches when looking for a specific address
        if (parseFloat(first.importance) < 0.2 && first.type === 'administrative') {
            return null;
        }

        return {
          lat: parseFloat(first.lat),
          lng: parseFloat(first.lon),
          display_name: first.display_name,
          source: 'osm' as const
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1. Search full query in OSM
  let result = await performSearch(cleanAddress);
  if (result === 'rate-limited') { await sleep(1200); result = await performSearch(cleanAddress); }
  if (result && typeof result !== 'string') return result;

  // 2. Search with Context
  if (context) {
    await sleep(800);
    result = await performSearch(`${cleanAddress} ${context}`);
    if (result && typeof result !== 'string') return result;
  }

  // 3. AI POI Search with Gemini (The game changer for companies/factories like "Formica")
  try {
    const aiResults = await searchLocationWithAI(cleanAddress);
    if (aiResults && aiResults.length > 0) {
      const top = aiResults[0];
      return {
        lat: top.lat,
        lng: top.lng,
        display_name: top.address ? `${top.name}, ${top.address}` : top.name,
        source: 'ai'
      };
    }
  } catch (err) {
    console.warn('[geocodeAddress] AI search fallback error:', err);
  }

  // 4. Smart Cleanup (Strip legal prefixes)
  const thaiPrefixes = ['บริษัท', 'ห้างหุ้นส่วน', 'บมจ.', 'หจก.', 'โรงงาน', 'คลังสินค้า', 'สำนักงาน'];
  const engSuffixes = [', Ltd.', ' Co., Ltd.', ' Co.,Ltd.', ' Ltd.', ' Co. Ltd.', ' PLC', ' Corp.'];
  let strippedAddress = cleanAddress;
  for (const p of thaiPrefixes) if (strippedAddress.startsWith(p)) { strippedAddress = strippedAddress.replace(p, '').trim(); break; }
  for (const s of engSuffixes) { const regex = new RegExp(s.replace('.', '\\.'), 'gi'); strippedAddress = strippedAddress.replace(regex, '').trim(); }
  
  if (strippedAddress !== cleanAddress) {
    await sleep(800);
    result = await performSearch(strippedAddress);
    if (result && typeof result !== 'string') return result;
  }

  return null;
}

/**
 * Reverse geocode: coordinates → Thai place name/address (Nominatim)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=th`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = (data?.name && String(data.name).trim()) || (data?.display_name && String(data.display_name).trim()) || null;
    return name || null;
  } catch {
    return null;
  }
}
