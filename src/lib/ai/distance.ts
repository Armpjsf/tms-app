"use server"

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
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // OSRM returns distance in meters, convert to kilometers
      const distanceMeters = data.routes[0].distance;
      return parseFloat((distanceMeters / 1000).toFixed(2));
    }
    
    return null;
  } catch (error) {
    console.error('Distance calculation failed:', error);
    return null;
  }
}
