'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type FuelFormData = {
  Date_Time: string
  Driver_ID: string
  Vehicle_Plate: string
  Fuel_Type: string
  Liter: number
  Price: number
  Total_Amount: number
  Mileage: number
}

export async function createFuelLog(data: FuelFormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Fuel_Logs')
    .insert({
      Date_Time: data.Date_Time,
      Driver_ID: data.Driver_ID,
      Vehicle_Plate: data.Vehicle_Plate,
      Fuel_Type: data.Fuel_Type,
      Liters: data.Liter,
      Price_Total: data.Total_Amount,
      Odometer: data.Mileage
    })

  if (error) {
    console.error('Error creating fuel log:', error)
    return { success: false, message: 'Failed to create log' }
  }

  revalidatePath('/fuel')
  return { success: true, message: 'Fuel Log created successfully' }
}
