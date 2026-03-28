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
            const isAndroid = /Android/i.test(navigator.userAgent);
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

            let finalUrl = navigationUrl;

            // Deep link for Android APK/WebView
            if (isAndroid) {
                // Extracts query/destination from standard URL to form an intent
                const urlObj = new URL(navigationUrl);
                const dest = urlObj.searchParams.get('destination') || urlObj.searchParams.get('query');
                if (dest) {
                    finalUrl = `google.navigation:q=${dest}`;
                }
            } 
            // Deep link for iOS
            else if (isIOS) {
                finalUrl = navigationUrl.replace('https://www.google.com/maps', 'comgooglemaps://');
            }

            // For APK environments, we try to redirect the current location
            // which the WebView will catch and pass to the OS intent system
            window.location.href = finalUrl;

            // Fallback for browsers if location.href doesn't trigger immediately
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    window.open(navigationUrl, '_blank');
                }
            }, 500);
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
