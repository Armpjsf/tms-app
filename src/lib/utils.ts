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
