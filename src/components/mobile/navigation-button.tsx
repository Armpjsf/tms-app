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
        
        const target = Array.isArray(destinations) ? destinations[0] : null;
        
        let url = "";
        if (target?.lat && target?.lng) {
            url = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
        } else {
            const address = job.Dest_Location || job.Route_Name || "";
            url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        }
        window.open(url, '_blank');
    }

    return (
        <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            onClick={handleNavigation}
        >
            <Navigation size={16} /> นำทาง
        </Button>
    )
}
