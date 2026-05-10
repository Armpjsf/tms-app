"use client"

import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"
import { Job } from "@/lib/supabase/jobs"

interface NavigationButtonProps {
    job: Job
}

export function NavigationButton({ job }: NavigationButtonProps) {
    const handleNavigate = () => {
        const destinations = typeof job.original_destinations_json === 'string' 
            ? JSON.parse(job.original_destinations_json) 
            : job.original_destinations_json;

        const completedDrops = job.Signature_Url ? job.Signature_Url.split(',').filter(Boolean).length : 0
        const currentDropIndex = Math.min(completedDrops, (Array.isArray(destinations) ? destinations.length : 1) - 1)

        let destinationQuery = "";

        // Calculate destination query for immediate stop
        if (Array.isArray(destinations) && destinations.length > 0) {
            const currentDest = destinations[currentDropIndex];
            destinationQuery = currentDest.lat && currentDest.lng ? `${currentDest.lat},${currentDest.lng}` : encodeURIComponent(currentDest.name);
        } else if (job.Delivery_Lat && job.Delivery_Lon) {
            destinationQuery = `${job.Delivery_Lat},${job.Delivery_Lon}`;
        } else {
            destinationQuery = encodeURIComponent(job.Dest_Location || job.Route_Name || "");
        }

        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Smart Waypoint Routing Logic
        let waypointUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;
        let hasWaypoints = false;

        if (Array.isArray(destinations) && destinations.length > 1) {
            const finalStop = destinations[destinations.length - 1];
            const finalQuery = finalStop.lat && finalStop.lng ? `${finalStop.lat},${finalStop.lng}` : encodeURIComponent(finalStop.name);
            
            // Waypoints: current stop up to second-to-last
            const waypointStops = destinations.slice(currentDropIndex, -1);
            if (waypointStops.length > 0) {
                hasWaypoints = true;
                const waypoints = waypointStops.map(s => 
                    s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.name)
                ).join('|');
                
                waypointUrl = `https://www.google.com/maps/dir/?api=1&destination=${finalQuery}&waypoints=${waypoints}&travelmode=driving`;
            } else {
                // At the final stop
                waypointUrl = `https://www.google.com/maps/dir/?api=1&destination=${finalQuery}&travelmode=driving`;
            }
        }

        // 1. If has waypoints, use Universal URL (Supported by Google Maps App)
        if (hasWaypoints) {
            window.open(waypointUrl, '_blank');
            return;
        }

        // 2. Single destination logic (Existing platform-specific intents)
        if (isAndroid) {
            const intentUrl = `google.navigation:q=${destinationQuery}`;
            window.location.href = intentUrl;
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.location.href = waypointUrl;
                }
            }, 1500);
        } else if (isIOS) {
            const googleMapsAppUrl = `comgooglemaps://?daddr=${destinationQuery}&directionsmode=driving`;
            window.location.href = googleMapsAppUrl;
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.location.href = `https://maps.apple.com/?daddr=${destinationQuery}`;
                }
            }, 1000);
        } else {
            window.open(waypointUrl, '_blank');
        }
    }

    return (
        <Button 
            onClick={handleNavigate}
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-12 px-6 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
        >
            <Navigation size={18} strokeWidth={2.5} /> 
            <span className="font-bold">นำทาง</span>
        </Button>
    )
}
