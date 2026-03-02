"use server"

import { createClient } from '@/utils/supabase/server'
// import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

// ============================================================
// Global Search — Quick results across Jobs, Customers, Drivers
// ============================================================

export type SearchResult = {
  id: string
  title: string
  subtitle: string
  type: 'job' | 'customer' | 'driver' | 'route'
  href: string
  icon?: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  try {
    const supabase = await createClient()
    // Branch filtering can be added here if needed
    const results: SearchResult[] = []

    // Search in parallel
    const [jobsResult, customersResult, driversResult, routesResult] = await Promise.all([
      // Jobs
      supabase
        .from('Jobs_Main')
        .select('Job_ID, Customer_Name, Route_Name, Job_Status, Plan_Date')
        .or(`Job_ID.ilike.%${query}%,Customer_Name.ilike.%${query}%,Route_Name.ilike.%${query}%`)
        .order('Created_At', { ascending: false })
        .limit(5),
      
      // Customers
      supabase
        .from('Master_Customers')
        .select('Customer_ID, Customer_Name, Phone')
        .or(`Customer_Name.ilike.%${query}%,Customer_ID.ilike.%${query}%`)
        .limit(5),
      
      // Drivers
      supabase
        .from('Master_Drivers')
        .select('Driver_ID, Driver_Name, Mobile_No, Vehicle_Plate')
        .or(`Driver_Name.ilike.%${query}%,Driver_ID.ilike.%${query}%,Mobile_No.ilike.%${query}%`)
        .limit(5),
      
      // Routes
      supabase
        .from('Master_Routes')
        .select('Route_Name, Origin, Destination')
        .or(`Route_Name.ilike.%${query}%,Origin.ilike.%${query}%,Destination.ilike.%${query}%`)
        .limit(3),
    ])

    // Map Jobs
    jobsResult.data?.forEach(job => {
      results.push({
        id: job.Job_ID,
        title: job.Job_ID,
        subtitle: `${job.Customer_Name || '-'} • ${job.Job_Status} • ${job.Plan_Date || ''}`,
        type: 'job',
        href: `/jobs`,
      })
    })

    // Map Customers
    customersResult.data?.forEach(c => {
      results.push({
        id: c.Customer_ID,
        title: c.Customer_Name,
        subtitle: c.Phone || 'ไม่มีเบอร์โทร',
        type: 'customer',
        href: `/settings/customers`,
      })
    })

    // Map Drivers
    driversResult.data?.forEach(d => {
      results.push({
        id: d.Driver_ID,
        title: d.Driver_Name || d.Driver_ID,
        subtitle: `${d.Vehicle_Plate || '-'} • ${d.Mobile_No || '-'}`,
        type: 'driver',
        href: `/drivers`,
      })
    })

    // Map Routes
    routesResult.data?.forEach(r => {
      results.push({
        id: r.Route_Name,
        title: r.Route_Name,
        subtitle: `${r.Origin || ''} → ${r.Destination || ''}`,
        type: 'route',
        href: `/routes`,
      })
    })

    return results
  } catch (error) {
    console.error('Global search error:', error)
    return []
  }
}
