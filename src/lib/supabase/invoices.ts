
import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"
import { logActivity } from './logs'

export type Invoice = {
  Invoice_ID: string
  Tax_Invoice_ID: string | null
  Customer_ID: string
  Issue_Date: string
  Due_Date: string | null
  Subtotal: number
  VAT_Rate: number
  VAT_Amount: number
  Grand_Total: number
  WHT_Rate: number
  WHT_Amount: number
  Net_Total: number
  Status: 'Draft' | 'Sent' | 'Paid' | 'Void' | 'Overdue'
  Notes: string | null
  Items_JSON: any
  Created_At: string
  Updated_At: string
  Created_By: string | null
  Branch_ID: string | null
  
  // Joins
  Customer_Name?: string
}

export async function getInvoices(page = 1, limit = 20, query = '') {
  try {
    const supabase = await createClient()

    // Filter by Branch
    const branchId = await getUserBranchId()
    const isAdmin = await isSuperAdmin()

    let queryBuilder = supabase
      .from('invoices')
      .select('*, Master_Customers(Customer_Name)', { count: 'exact' })
    
    if (branchId && !isAdmin) {
        queryBuilder = queryBuilder.or(`Branch_ID.eq.${branchId},Branch_ID.is.null`)
    } else if (!isAdmin && !branchId) {
        return { data: [], count: 0 }
    }

    let q = queryBuilder.order('Created_At', { ascending: false })

    if (query) {
       q = q.or(`Invoice_ID.ilike.%${query}%,Tax_Invoice_ID.ilike.%${query}%`)
    }

    const { data, error, count } = await q.range((page - 1) * limit, page * limit - 1)
    
    if (error) {
        console.error('Error fetching invoices:', error)
        return { data: [], count: 0 }
    }

    // Map customer name
    const formattedData = data?.map((inv: any) => ({
        ...inv,
        Customer_Name: inv.Master_Customers?.Customer_Name || 'Unknown',
        customers: inv.Master_Customers
    }))

    return { data: formattedData, count: count || 0 }
  } catch (error) {
    console.error('Error in getInvoices:', error)
    return { data: [], count: 0 }
  }
}

export async function getInvoiceById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('*, Master_Customers(*)')
      .eq('Invoice_ID', id)
      .single()
    
    if (error) throw error
    
    // We might need to fetch items if Items_JSON is not enough or if we want latest data?
    // Items_JSON is a snapshot. We should use it for the invoice.
    if (data && data.Master_Customers) {
        data.customers = data.Master_Customers;
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return { success: false, error }
  }
}

export async function createInvoice(invoice: Partial<Invoice>) {
  try {
    const supabase = await createClient()
    
    // Auto-assign Branch_ID if missing
    if (!invoice.Branch_ID) {
        invoice.Branch_ID = await getUserBranchId()
    }

    // Generate ID if not present (simple logic for now)
    if (!invoice.Invoice_ID) {
        // In real app, use a sequence or generate unique ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const random = Math.floor(Math.random() * 1000)
        invoice.Invoice_ID = `INV-${dateStr}-${random}`
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) throw error

    // Log invoice creation
    await logActivity({
      module: 'Billing',
      action_type: 'CREATE',
      target_id: data.Invoice_ID,
      details: {
        customer: data.Customer_Name,
        total: data.Grand_Total,
        tax_id: data.Tax_Invoice_ID
      }
    })

    // Link Jobs to this Invoice
    if (invoice.Items_JSON && Array.isArray(invoice.Items_JSON)) {
        const jobIds = invoice.Items_JSON.map((j: any) => j.Job_ID)
        if (jobIds.length > 0) {
            const { error: updateError } = await supabase
                .from('Jobs_Main')
                .update({ Invoice_ID: data.Invoice_ID })
                .in('Job_ID', jobIds)
            
            if (updateError) {
                console.error('Error linking jobs to invoice:', updateError)
                // Should we rollback? For now, just log.
            }
        }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { success: false, error }
  }
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('Invoice_ID', id)
      .select()
      .single()

    if (error) throw error

    // Log update
    await logActivity({
      module: 'Billing',
      action_type: 'UPDATE',
      target_id: id,
      details: {
        updated_status: updates.Status,
        grand_total: updates.Grand_Total
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error updating invoice:', error)
    return { success: false, error }
  }
}

export async function deleteInvoice(id: string) {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('Invoice_ID', id)
  
      if (error) throw error

      // Log deletion
      await logActivity({
        module: 'Billing',
        action_type: 'DELETE',
        target_id: id,
        details: {
          description: `Deleted invoice ${id}`
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      return { success: false, error }
    }
  }
