import { createClient } from '@/utils/supabase/server'

export type SOSAlert = {
  Job_ID: string
  Job_Status: string
  Plan_Date: string | null
  Driver_ID: string | null
  Driver_Name: string | null
  Vehicle_Plate: string | null
  Route_Name: string | null
  Failed_Reason: string | null
  Failed_Time: string | null
  Delivery_Lat: number | null
  Delivery_Lon: number | null
}

// ดึง SOS Alerts ที่ Active
export async function getActiveSOSAlerts(): Promise<SOSAlert[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Driver_ID, Driver_Name, Vehicle_Plate, Route_Name, Failed_Reason, Failed_Time, Delivery_Lat, Delivery_Lon')
      .eq('Job_Status', 'SOS')
      .order('Failed_Time', { ascending: false })
    
    if (error) {
      console.error('Error fetching SOS alerts:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching SOS alerts:', e)
    return []
  }
}

// ดึง SOS ทั้งหมด (รวม resolved)
export async function getAllSOSAlerts(): Promise<SOSAlert[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date, Driver_ID, Driver_Name, Vehicle_Plate, Route_Name, Failed_Reason, Failed_Time, Delivery_Lat, Delivery_Lon')
      .in('Job_Status', ['SOS', 'Failed'])
      .order('Failed_Time', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('Error fetching all SOS:', JSON.stringify(error))
      return []
    }
    
    return data || []
  } catch (e) {
    console.error('Exception fetching all SOS:', e)
    return []
  }
}

// นับ SOS Active
export async function getSOSCount(): Promise<number> {
  try {
    const supabase = await createClient()
    
    const { count, error } = await supabase
      .from('Jobs_Main')
      .select('*', { count: 'exact', head: true })
      .eq('Job_Status', 'SOS')
    
    if (error) {
      console.error('Error counting SOS:', JSON.stringify(error))
      return 0
    }
    
    return count || 0
  } catch (e) {
    console.error('Exception counting SOS:', e)
    return 0
  }
}
