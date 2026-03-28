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

        let navigationUrl = "";

        // Calculate URL
        if (Array.isArray(destinations) && destinations.length > 1) {
            const last = destinations[destinations.length - 1];
            const intermediates = destinations.slice(1, -1);
            const destQuery = last.lat && last.lng ? `${last.lat},${last.lng}` : encodeURIComponent(last.name);
            const waypointQuery = intermediates.map(w => 
                w.lat && w.lng ? `${w.lat},${w.lng}` : encodeURIComponent(w.name)
            ).join('|');

            navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}`;
            if (waypointQuery) {
                navigationUrl += `&waypoints=${waypointQuery}`;
            }
        } else if (job.Delivery_Lat && job.Delivery_Lon) {
            navigationUrl = `https://www.google.com/maps/search/?api=1&query=${job.Delivery_Lat},${job.Delivery_Lon}`;
        } else {
            const target = Array.isArray(destinations) ? destinations[0] : null;
            if (target?.lat && target?.lng) {
                navigationUrl = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
            } else {
                const address = job.Dest_Location || job.Route_Name || "";
                navigationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            }
        }

        if (navigationUrl) {
            // Use a slight delay to ensure it's handled as a user-initiated action
            const newWindow = window.open(navigationUrl, '_blank', 'noopener,noreferrer');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                // Fallback if window.open is blocked
                window.location.href = navigationUrl;
            }
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
