"use server"

import { createClient } from '@/utils/supabase/server'

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
  Origin_Location?: string | null
  Dest_Location?: string | null
  Default_Origin?: string | null
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
    
    if (branchId && branchId !== 'All') {
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
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

    // Get User Branch
    const branchId = await getUserBranchId()

    const { data, error } = await supabase
      .from('Master_Customers')
      .insert({
        Customer_ID: customerId,
        Customer_Name: customerData.Customer_Name,
        Contact_Person: customerData.Contact_Person,
        Phone: customerData.Phone,
        // Email: customerData.Email,
        Address: customerData.Address,
        Tax_ID: customerData.Tax_ID,
        Branch_ID: customerData.Branch_ID || branchId || 'HQ', // Default to HQ if not found
        // Is_Active: true
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

// Bulk create customers
export async function createBulkCustomers(customers: any[]) {
    try {
        const supabase = await createClient()
        const branchId = await getUserBranchId()
        
        // Normalize keys
        const normalizeData = (row: any) => {
            const normalized: any = {}
            const getValue = (keys: string[]) => {
                const rowKeys = Object.keys(row)
                for (const key of keys) {
                    const foundKey = rowKeys.find(k => k.toLowerCase().replace(/\\s+/g, '') === key.toLowerCase().replace(/\\s+/g, ''))
                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                        return row[foundKey]
                    }
                }
                return undefined
            }
    
            normalized.Customer_Name = getValue(['customer_name', 'name', 'company', 'company_name', 'ชื่อลูกค้า', 'ชื่อบริษัท'])
            normalized.Contact_Person = getValue(['contact_person', 'contact', 'ผู้ติดต่อ'])
            normalized.Phone = getValue(['phone', 'mobile', 'tel', 'เบอร์โทร', 'โทรศัพท์'])
            normalized.Email = getValue(['email', 'mail', 'อีเมล'])
            normalized.Address = getValue(['address', 'location', 'ที่อยู่'])
            normalized.Tax_ID = getValue(['tax_id', 'tax', 'เลขผู้เสียภาษี'])
            
            return normalized
        }
    
        const cleanData = customers.map(c => normalizeData(c)).filter(c => c.Customer_Name)
    
        if (cleanData.length === 0) {
            return { success: false, message: "ไม่พบข้อมูลที่ถูกต้อง (ต้องมีชื่อลูกค้า)" }
        }

        // Generate IDs and prepare for insert
        const customersToInsert = cleanData.map(c => {
             const dateStr = new Date().toISOString().slice(2,7).replace('-','') // YYMM
             const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
             const customerId = `CUST-${dateStr}-${random}-${Math.random().toString(36).substr(2, 3).toUpperCase()}` // Ensure uniqueness
             
             return {
                Customer_ID: customerId,
                Customer_Name: c.Customer_Name,
                Contact_Person: c.Contact_Person,
                Phone: c.Phone,
                // Email: c.Email, // Removed due to missing column in DB
                Address: c.Address,
                Tax_ID: c.Tax_ID,
                Branch_ID: branchId || 'HQ',
                // Is_Active: true // Removed due to missing column
             }
        })

        // Check for existing customers to avoid duplicates (since no unique constraint on DB)
        const namesToCheck = customersToInsert.map(c => c.Customer_Name)
        
        const { data: existingCustomers } = await supabase
            .from('Master_Customers')
            .select('Customer_Name')
            .in('Customer_Name', namesToCheck)

        const existingNames = new Set(existingCustomers?.map(c => c.Customer_Name) || [])
        
        const validInserts = customersToInsert.filter(c => !existingNames.has(c.Customer_Name))

        if (validInserts.length === 0) {
            return { success: true, message: "ไม่มีข้อมูลใหม่ (รายชื่อซ้ำกับที่มีอยู่ทั้งหมด)" }
        }

        const { error } = await supabase
            .from('Master_Customers')
            .insert(validInserts)

        if (error) {
            console.error("Bulk create customers error:", error)
            return { success: false, message: `Failed to import: ${error.message}` }
        }
    
        const skippedCount = customersToInsert.length - validInserts.length
        return { 
            success: true, 
            message: `นำเข้าสำเร็จ ${validInserts.length} รายการ` + (skippedCount > 0 ? ` (ข้ามซ้ำ ${skippedCount} รายการ)` : '')
        }

    } catch (e: any) {
        return { success: false, message: e.message }
    }
}
