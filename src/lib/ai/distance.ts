"use server"

type OsrmWaypoint = {
  trips_index: number;
  waypoint_index: number;
}

type OsrmTripResponse = {
  code?: string;
  waypoints?: OsrmWaypoint[];
  routes?: { distance?: number }[];
}

/**
 * Distance Utility — TMS 2026
 * Using OSRM (Open Source Routing Machine) to get driving distances between points.
 */

export async function getDrivingDistance(
  points: { lat: number; lng: number }[]
): Promise<number | null> {
  if (points.length < 2) return null;

  try {
    // Construct coordinate string: lng,lat;lng,lat...
    const coordsStr = points.map(p => `${p.lng},${p.lat}`).join(';');
    
    // Use OSRM public API (route service)
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false&alternatives=false`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)'
      }
    });

    if (!response.ok) return null;
    
    const data = await response.json() as OsrmTripResponse;
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // OSRM returns distance in meters, convert to kilometers
      const distanceMeters = data.routes[0].distance ?? 0;
      return parseFloat((distanceMeters / 1000).toFixed(2));
    }
    
    return null;
  } catch (error) {
    console.error('Distance calculation failed:', error);
    return null;
  }
}

/**
 * Straight-line (Haversine) distance across a sequence of points, in km.
 * Used as a deterministic fallback when the OSRM routing server is
 * unreachable or rate-limited, so a job never ends up with a blank distance.
 */
function haversineDistanceKm(points: { lat: number; lng: number }[]): number {
  const R = 6371 // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(s))
  }
  return parseFloat(total.toFixed(2))
}

/**
 * Resolve a driving distance for a set of ordered points, guaranteeing a
 * value whenever there are >= 2 valid points.
 *
 * Order of preference:
 *   1. OSRM driving distance (accurate, road network)
 *   2. Haversine straight-line distance (always available)
 *
 * Returns null only when there are fewer than 2 points to measure.
 * This is the single source of truth used by BOTH job creation and file
 * import so distances are populated consistently on the server, instead of
 * relying on a flaky client-side OSRM call or an exact Master_Routes match.
 */
export async function resolveDistanceKm(
  points: { lat: number; lng: number }[]
): Promise<number | null> {
  const valid = points.filter(
    p =>
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      !Number.isNaN(p.lat) &&
      !Number.isNaN(p.lng)
  )
  if (valid.length < 2) return null

  const osrm = await getDrivingDistance(valid)
  if (osrm !== null && osrm > 0) return osrm

  // Fallback: never leave the field blank when we have coordinates.
  return haversineDistanceKm(valid)
}

/**
 * Route Optimization — TMS 2026
 * Uses OSRM Trip service to solve Traveling Salesman Problem (TSP).
 * Returns the optimized sequence of indices.
 */
export async function optimizeRouteSequence(
  points: { lat: number; lng: number }[]
): Promise<number[] | null> {
  // Need at least 3 points to have something to optimize (1 start + 2 destinations)
  if (points.length < 3) return points.map((_, i) => i);

  try {
    const coordsStr = points.map(p => `${p.lng},${p.lat}`).join(';');
    // source=first: fix the start point
    // roundtrip=false: don't return to start
    const url = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?source=first&destination=any&roundtrip=false&overview=false`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)'
      }
    });

    if (!response.ok) return null;
    
    const data = await response.json() as OsrmTripResponse;
    
    if (data.code === 'Ok' && data.waypoints) {
      // waypoints[i].trips_index is the visit order for the i-th input point
      // We want to return a list of input indices in the order they should be visited
      const optimizedIndices = data.waypoints
        .sort((a: OsrmWaypoint, b: OsrmWaypoint) => a.trips_index - b.trips_index)
        .map((w: OsrmWaypoint) => w.waypoint_index);
      
      return optimizedIndices;
    }
    
    return null;
  } catch (error) {
    console.error('Route optimization failed:', error);
    return null;
  }
}
