"use server"

/**
 * Geocoding Utility — TMS 2026
 * Using Nominatim (OpenStreetMap) to convert addresses to coordinates.
 * Respects Nominatim Usage Policy (Rate limiting, User-Agent).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const performSearch = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=th`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' 
        }
      });
      
      if (response.status === 429) {
        console.warn('[Geocoding] Rate limited (429). Waiting...');
        return 'rate-limited';
      }

      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const first = data[0];
        
        // Check "importance" and "type". If it's a "state" or "country" result for a specific building search, it's likely a bad match.
        // For specific company/landmark searches, we want importance > 0.3 or type != 'administrative'
        if (parseFloat(first.importance) < 0.2 && first.type === 'administrative') {
            console.log('[Geocoding] Rejecting broad match:', first.display_name);
            return null;
        }

        return {
          lat: parseFloat(first.lat),
          lng: parseFloat(first.lon),
          display_name: first.display_name
        };
      }
      return null;
    } catch (err) {
      console.error('[Geocoding] Fetch Error:', err);
      return null;
    }
  };

  // Helper for Gemini Cleaning
  const cleanWithAI = async (addr: string): Promise<string | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Convert this Thai address into a searchable string for OpenStreetMap (districts, roads, landmarks only). 
        Address: "${addr}"
        Respond ONLY with the cleaned searchable string. Do not include company legal tags like Co., Ltd. or บริษัท.
        Example: "บริษัท ทอสเท็มไทย จำกัด นวนคร" -> "นวนคร คลองหลวง ปทุมธานี"`;
        
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error('[Geocoding] Gemini Error:', err);
        return null;
    }
  };

  // Sequence of strategies:
  
  // 1. Full address (Best chance)
  let result = await performSearch(cleanAddress);
  if (result === 'rate-limited') { await sleep(1500); result = await performSearch(cleanAddress); }
  if (result && typeof result !== 'string') return result;

  // 2. Address + Context
  if (context) {
    await sleep(1000); // Respect OSM 1req/sec limit
    result = await performSearch(`${cleanAddress} ${context}`);
    if (result === 'rate-limited') { await sleep(1500); result = await performSearch(`${cleanAddress} ${context}`); }
    if (result && typeof result !== 'string') return result;
  }

  // 3. Smart Cleanup (Regex based)
  const thaiPrefixes = ['บริษัท', 'ห้างหุ้นส่วน', 'บมจ.', 'หจก.', 'โรงงาน', 'คลังสินค้า', 'สำนักงาน'];
  const engSuffixes = [', Ltd.', ' Co., Ltd.', ' Co.,Ltd.', ' Ltd.', ' Co. Ltd.', ' PLC', ' Corp.'];
  let strippedAddress = cleanAddress;
  for (const p of thaiPrefixes) if (strippedAddress.startsWith(p)) { strippedAddress = strippedAddress.replace(p, '').trim(); break; }
  for (const s of engSuffixes) { const regex = new RegExp(s.replace('.', '\\.'), 'gi'); strippedAddress = strippedAddress.replace(regex, '').trim(); }
  
  if (strippedAddress !== cleanAddress) {
    await sleep(1000);
    result = await performSearch(strippedAddress);
    if (result === 'rate-limited') { await sleep(1500); result = await performSearch(strippedAddress); }
    if (result && typeof result !== 'string') return result;
  }

  // 4. Gemini Fallback (The "Magic" Step)
  console.log('[Geocoding] Using Gemini for:', cleanAddress);
  const aiSearchString = await cleanWithAI(cleanAddress);
  if (aiSearchString) {
      await sleep(1000);
      result = await performSearch(aiSearchString);
      if (result === 'rate-limited') { await sleep(1500); result = await performSearch(aiSearchString); }
      if (result && typeof result !== 'string') return result;
  }

  // 5. Last Resort tokenization
  const tokens = cleanAddress.split(' ');
  if (tokens.length > 2) {
    const fallbackQuery = tokens.slice(-2).join(' '); 
    await sleep(1000);
    result = await performSearch(fallbackQuery);
    if (result === 'rate-limited') { await sleep(1500); result = await performSearch(fallbackQuery); }
    if (result && typeof result !== 'string') return result;
  }

  return null;
}

