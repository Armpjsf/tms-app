import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts Latitude and Longitude from Google Maps URLs.
 * Supports:
 * - @13.7563,100.5018,15z
 * - ?q=13.7563,100.5018
 * - ?ll=13.7563,100.5018
 */
export function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url || !url.startsWith("http")) return null;

  const latLngRegex = /@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/; // @lat,lng
  const queryRegex = /[?&](q|ll)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/; // q=lat,lng or ll=lat,lng

  const matchAt = url.match(latLngRegex);
  if (matchAt) {
    return {
      lat: parseFloat(matchAt[1]),
      lng: parseFloat(matchAt[2])
    };
  }

  const matchQuery = url.match(queryRegex);
  if (matchQuery) {
    return {
      lat: parseFloat(matchQuery[2]),
      lng: parseFloat(matchQuery[3])
    };
  }

  // !3dLAT!4dLNG (embedded in place URLs)
  const m3d = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m3d) return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };

  return null;
}

/**
 * ดึง "ข้อความชื่อ/ที่อยู่" จากลิ้ง Google Maps แบบค้นหา (?query=... หรือ ?q=...)
 * คืน null ถ้า param เป็นพิกัด (lat,lng) หรือไม่มีข้อความ
 */
export function extractQueryTextFromUrl(url: string): string | null {
  if (!url || !url.startsWith("http")) return null;
  const m = url.match(/[?&](?:query|q)=([^&]+)/);
  if (!m) return null;
  let text: string;
  try { text = decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { text = m[1]; }
  text = text.trim();
  if (!text) return null;
  // ถ้าเป็นพิกัดล้วน (13.75,100.50) ไม่ใช่ชื่อ
  if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(text)) return null;
  return text;
}

/**
 * สร้างลิ้ง Google Maps (รูปแบบเดียวกับที่ระบบใช้ ?api=1&query=)
 * ให้พิกัดก่อน (แม่นกว่า) ถ้าไม่มีใช้ชื่อ
 */
export function buildGoogleMapLink(opts: { name?: string | null; lat?: number | null; lng?: number | null }): string | null {
  const { name, lat, lng } = opts;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (name && name.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name.trim())}`;
  }
  return null;
}

export function isPointInPolygon(point: [number, number], polygon: [number, number][]) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
