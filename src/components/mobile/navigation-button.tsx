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

        // Standard Google Maps URL (Most compatible)
        const universalUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;

        if (isAndroid) {
            // For Android, we must use window.open to force handoff to system browser (Chrome/Maps)
            // as internal WebViews often fail to resolve intent:// schemes via window.location.href
            const newWindow = window.open(universalUrl, '_blank', 'noopener,noreferrer');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                // Pop-up blocked or not handled, fallback to geo: or location.href
                window.location.href = `geo:0,0?q=${destinationQuery}`;
                // Secondary fallback to standard URL if geo fails
                setTimeout(() => {
                    if (document.visibilityState === 'visible') {
                        window.location.href = universalUrl;
                    }
                }, 1000);
            }
        } else if (isIOS) {
            // For iOS, try to open in app first, then fallback to web maps
            window.location.href = `comgooglemaps://?daddr=${destinationQuery}&directionsmode=driving`;
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.location.href = `https://maps.apple.com/?daddr=${destinationQuery}`;
                }
            }, 500);
        } else {
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
