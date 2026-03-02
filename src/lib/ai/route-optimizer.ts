"use server"

/**
 * AI Route Optimizer — TMS 2026 (Open-Source Edition)
 * Using OSRM (Open Source Routing Machine) to solve Traveling Salesman Problem (TSP).
 * Service: http://router.project-osrm.org/trip/v1/driving/
 */

export type RoutePoint = {
  name: string
  lat: number
  lng: number
  address?: string
}

export type OptimizationResult = {
  success: boolean
  optimizedOrder: number[] // Indices of destinations in original array
  message?: string
  estimatedDurationMinutes?: number
  estimatedDistanceKm?: number
}

export async function optimizeRoute(
  origin: RoutePoint,
  destinations: RoutePoint[]
): Promise<OptimizationResult> {
  if (destinations.length <= 1) {
    return { success: true, optimizedOrder: [0], message: "ลำดับเดียวไม่ต้องจัดใหม่" }
  }

  try {
    // Construct coordinate string: lng,lat;lng,lat;...
    // OSRM Trip API solves TSP. 
    // We want to start at 'origin' and end at the 'last' destination.
    const allPoints = [origin, ...destinations];
    const coordString = allPoints.map(p => `${p.lng},${p.lat}`).join(';');

    // source=first means start at the first point (origin)
    // destination=last means end at the last point of the sequence (last destination in our original array)
    // roundtrip=false prevents returning to the start
    const url = `http://router.project-osrm.org/trip/v1/driving/${coordString}?source=first&destination=last&roundtrip=false&geometries=geojson&overview=simplified`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OSRM Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
       throw new Error(`OSRM API Response Code: ${data.code}`);
    }

    // waypoint_index maps the returned optimized order back to the input array
    // data.waypoints is an array of objects including waypoint_index
    // The order in data.waypoints corresponds to the optimized trip
    
    // We ignore the first waypoint (origin) and get the order of destinations
    const optimizedWays = data.waypoints
        .sort((a: any, b: any) => a.trips_index - b.trips_index) // Not needed, order in array is usually correct
        .filter((w: any) => w.waypoint_index > 0) // Skip origin (index 0)
        .map((w: any) => w.waypoint_index - 1); // Normalize index to destinations array

    const trip = data.trips?.[0];

    return {
      success: true,
      optimizedOrder: optimizedWays,
      estimatedDurationMinutes: Math.round((trip?.duration || 0) / 60),
      estimatedDistanceKm: Math.round((trip?.distance || 0) / 1000)
    };

  } catch (error) {
    console.error("[AI Route] OSRM Optimization Error:", error);
    return fallbackSort(origin, destinations);
  }
}

/**
 * Fallback: Greedy Nearest Neighbor (Simple Logic)
 * If API fails or is missing, we at least sort by literal distance.
 */
function fallbackSort(origin: RoutePoint, destinations: RoutePoint[]): OptimizationResult {
  const result: number[] = [];
  const unvisited = [...destinations.keys()];
  let currentPos = origin;

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDist = Infinity;

    for (const idx of unvisited) {
      const dest = destinations[idx];
      const d = Math.sqrt(Math.pow(dest.lat - currentPos.lat, 2) + Math.pow(dest.lng - currentPos.lng, 2));
      if (d < minDist) {
        minDist = d;
        nearestIdx = idx;
      }
    }

    if (nearestIdx !== -1) {
      result.push(nearestIdx);
      currentPos = destinations[nearestIdx];
      unvisited.splice(unvisited.indexOf(nearestIdx), 1);
    }
  }

  return { 
    success: true, 
    optimizedOrder: result, 
    message: "ใช้การคำนวณระยะทางแบบเส้นตรง (Fallback)" 
  };
}
