import { createClient } from '@/utils/supabase/client'

export type Customer = {
  Customer_ID: string
  Customer_Name: string
  Contact_Person: string | null
  Phone: string | null
  Email: string | null
  Address: string | null
  Tax_ID: string | null
  Branch_ID: string | null
  Is_Active: boolean | null
}

// Get all customers
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export async function getAllCustomers(page?: number, limit?: number, query?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('Master_Customers').select('*', { count: 'exact' })
    
    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()
    
    if (branchId && !isAdmin) {
        // @ts-ignore
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`Customer_Name.ilike.%${query}%,Customer_ID.ilike.%${query}%`)
    }
    
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    const { data, error, count } = await queryBuilder.order('Customer_ID', { ascending: false })
    
    if (error) {
      console.error('Error fetching customers:', JSON.stringify(error))
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Create customer
export async function createCustomer(customerData: Partial<Customer>) {
  try {
    const supabase = await createClient()
    
    // Generate ID if not provided: CUST-YYYYMM-XXXX
    let customerId = customerData.Customer_ID
    if (!customerId) {
        const dateStr = new Date().toISOString().slice(2,7).replace('-','') // YYMM
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        customerId = `CUST-${dateStr}-${random}`
    }

    const { data, error } = await supabase
      .from('Master_Customers')
      .insert({
        Customer_ID: customerId,
        Customer_Name: customerData.Customer_Name,
        Contact_Person: customerData.Contact_Person,
        Phone: customerData.Phone,
        Email: customerData.Email,
        Address: customerData.Address,
        Tax_ID: customerData.Tax_ID,
        Branch_ID: branchId || 'HQ', // Default to HQ if not found
        Is_Active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating customer:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Update customer
export async function updateCustomer(id: string, customerData: Partial<Customer>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Customers')
      .update(customerData)
      .eq('Customer_ID', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating customer:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e }
  }
}

// Delete customer
export async function deleteCustomer(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('Master_Customers')
      .delete()
      .eq('Customer_ID', id)
    
    if (error) {
      console.error('Error deleting customer:', JSON.stringify(error))
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}
