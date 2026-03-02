"use client"

import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"
import { Job } from "@/lib/supabase/jobs"

interface NavigationButtonProps {
    job: Job
}

export function NavigationButton({ job }: NavigationButtonProps) {
    const handleNavigation = () => {
        const destinations = typeof job.original_destinations_json === 'string' 
            ? JSON.parse(job.original_destinations_json) 
            : job.original_destinations_json;

        // If it's a multi-stop job (more than 1 destination)
        if (Array.isArray(destinations) && destinations.length > 1) {
            const last = destinations[destinations.length - 1];
            const intermediates = destinations.slice(1, -1);

            // Create Google Maps Directions URL
            // Format: https://www.google.com/maps/dir/?api=1&destination=LAST&waypoints=W1|W2|W3
            // Note: origin is optional and defaults to current location if omitted
            const destQuery = last.lat && last.lng ? `${last.lat},${last.lng}` : encodeURIComponent(last.name);
            const waypointQuery = intermediates.map(w => 
                w.lat && w.lng ? `${w.lat},${w.lng}` : encodeURIComponent(w.name)
            ).join('|');

            let url = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}`;
            if (waypointQuery) {
                url += `&waypoints=${waypointQuery}`;
            }

            window.open(url, '_blank');
            return;
        }

        // Priority 1: Direct coordinates from database (Single point)
        if (job.Delivery_Lat && job.Delivery_Lon) {
            const url = `https://www.google.com/maps/search/?api=1&query=${job.Delivery_Lat},${job.Delivery_Lon}`;
            window.open(url, '_blank');
            return;
        }

        // Priority 2: Single point from JSON
        const target = Array.isArray(destinations) ? destinations[0] : null;
        if (target?.lat && target?.lng) {
            const url = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
            window.open(url, '_blank');
            return;
        }

        // Priority 3: Text address fallback
        const address = job.Dest_Location || job.Route_Name || "";
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    return (
        <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-blue-700 gap-2"
            onClick={handleNavigation}
        >
            <Navigation size={16} /> นำทาง
        </Button>
    )
}
