import { getUnassignedJobs } from '@/lib/actions/marketplace-actions'
import { MarketplaceClient } from './marketplace-client'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function MobileMarketplacePage() {
    // 1. Get current driver context
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
        redirect('/login')
    }

    // Attempt to get Driver details
    const { data: driverData } = await supabase
        .from('Master_Driver')
        .select('Driver_ID, Driver_Target_Name')
        .eq('Email', session.user.email)
        .single()

    // 2. Fetch unassigned jobs from server
    const jobs = await getUnassignedJobs()

    return (
        <MarketplaceClient 
            initialJobs={jobs} 
            driverId={driverData?.Driver_ID || ''}
            driverName={driverData?.Driver_Target_Name || session.user.email || ''}
        />
    )
}
