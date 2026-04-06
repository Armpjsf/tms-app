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

        // Standard Universal URL
        const universalUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;

        if (isAndroid) {
            // Android Direct Intent for Navigation (Avoids browser double-opening)
            const intentUrl = `google.navigation:q=${destinationQuery}`;
            window.location.href = intentUrl;
            
            // Optional fallback after a delay if the app didn't open
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    // Only open web map if we are still in the app (intent failed)
                    window.location.href = universalUrl;
                }
            }, 1500);
        } else if (isIOS) {
            // iOS: Try Google Maps app first, then fallback to Apple Maps or Web
            const googleMapsAppUrl = `comgooglemaps://?daddr=${destinationQuery}&directionsmode=driving`;
            window.location.href = googleMapsAppUrl;
            
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.location.href = `https://maps.apple.com/?daddr=${destinationQuery}`;
                }
            }, 1000);
        } else {
            // Desktop/Other
            window.open(universalUrl, '_blank');
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
