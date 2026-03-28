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
        let destinationQuery = "";

        // Calculate destination query
        if (Array.isArray(destinations) && destinations.length > 0) {
            const last = destinations[destinations.length - 1];
            destinationQuery = last.lat && last.lng ? `${last.lat},${last.lng}` : encodeURIComponent(last.name);
        } else if (job.Delivery_Lat && job.Delivery_Lon) {
            destinationQuery = `${job.Delivery_Lat},${job.Delivery_Lon}`;
        } else {
            destinationQuery = encodeURIComponent(job.Dest_Location || job.Route_Name || "");
        }

        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isAndroid) {
            // Standard Android Intent for Google Maps app
            navigationUrl = `google.navigation:q=${destinationQuery}`;
        } else if (isIOS) {
            // Standard iOS URL Scheme for Google Maps app
            navigationUrl = `comgooglemaps://?daddr=${destinationQuery}&directionsmode=driving`;
        } else {
            // Fallback for desktop/others
            navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;
        }

        // Action: Direct location assignment is most reliable for WebViews/APK
        if (navigationUrl) {
            window.location.href = navigationUrl;
            
            // Secondary fallback if the custom scheme isn't handled (e.g. app not installed)
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;
                    window.open(fallbackUrl, '_blank');
                }
            }, 1000);
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
