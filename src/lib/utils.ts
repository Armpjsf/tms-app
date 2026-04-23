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
