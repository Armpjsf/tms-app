'use server'

import { createAdminClient } from "@/utils/supabase/server"
import { getUserBranchId } from "@/lib/permissions"
import { logActivity } from "@/lib/supabase/logs"
import { revalidatePath } from "next/cache"

export async function confirmInvoiceAndCreateBillingNote(invoiceId: string) {
    try {
        const supabase = await createAdminClient()

        // 1. Get Invoice Data with Customer Name join
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*, Master_Customers(Customer_Name)')
            .eq('Invoice_ID', invoiceId)
            .single()

        if (invoiceError || !invoice) throw new Error("ไม่พบข้อมูลใบแจ้งหนี้")
        
        const finalCustomerName = (invoice as any).Master_Customers?.Customer_Name || invoice.Customer_Name || "Unknown"

        // 2. Use the same ID for Billing Note as the Invoice (As requested: "เลขชุดเดียวกัน")
        const billingNoteId = invoiceId
        
        const { data: existingBN } = await supabase
            .from('Billing_Notes')
            .select('Billing_Note_ID')
            .eq('Billing_Note_ID', billingNoteId)
            .maybeSingle()

        if (existingBN) throw new Error("ใบวางบิลนี้ถูกสร้างไปแล้ว")

        // 3. Get Branch ID from Jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('Jobs_Main')
            .select('Job_ID, Branch_ID')
            .eq('Invoice_ID', invoiceId)

        if (jobsError || !jobs || jobs.length === 0) throw new Error("ไม่พบรายการงานที่ผูกกับใบแจ้งหนี้นี้")
        
        const branchId = jobs[0].Branch_ID || (await getUserBranchId()) || 'HQ'

        // 4. Insert Billing Note
        const { error: insertError } = await supabase
            .from('Billing_Notes')
            .insert({
                Billing_Note_ID: billingNoteId,
                Customer_Name: finalCustomerName,
                Billing_Date: new Date().toISOString(),
                Due_Date: invoice.Due_Date,
                Total_Amount: invoice.Subtotal, // Or Net_Total depending on business pref, usually Subtotal for Statement
                Status: 'Pending',
                Created_At: new Date().toISOString(),
                Updated_At: new Date().toISOString(),
                Branch_ID: branchId
            })

        if (insertError) throw insertError

        // 5. Update Jobs with Billing Note ID
        const { error: updateJobsError } = await supabase
            .from('Jobs_Main')
            .update({ Billing_Note_ID: billingNoteId })
            .eq('Invoice_ID', invoiceId)

        if (updateJobsError) throw updateJobsError

        // 5.5 Data Healing: Sync ALL validated prices and JSON back to Jobs_Main for analytical integrity
        if (invoice.Items_JSON && Array.isArray(invoice.Items_JSON)) {
            try {
                const syncPromises = invoice.Items_JSON.map((item: any) => {
                    if (!item.Job_ID) return null
                    
                    // Comprehensive Sync: Update all price fields and the raw extra_costs_json
                    // Fix: Fallback calculation if snapshot price is 0
                    let priceTotal = Number(item.Price_Cust_Total || 0)
                    if (priceTotal === 0) {
                        const qty = Number(item.Weight_Kg || item.Volume_Cbm || item.Loaded_Qty || 1)
                        const unitPrice = Number(item.Price_Per_Unit || 0)
                        if (unitPrice > 0) {
                            priceTotal = Number((qty * unitPrice).toFixed(2))
                        }
                    }

                    return supabase
                        .from('Jobs_Main')
                        .update({ 
                            Price_Cust_Total: priceTotal,
                            Price_Per_Unit: Number(item.Price_Per_Unit || 0),
                            Price_Cust_Extra: Number(item.Price_Cust_Extra || 0),
                            Charge_Labor: Number(item.Charge_Labor || 0),
                            Charge_Wait: Number(item.Charge_Wait || 0),
                            Price_Cust_Other: Number(item.Price_Cust_Other || 0),
                            extra_costs_json: item.extra_costs_json || []
                        })
                        .eq('Job_ID', item.Job_ID)
                }).filter(Boolean)

                if (syncPromises.length > 0) {
                    await Promise.all(syncPromises)
                }
            } catch (syncError) {
                console.error("Data Healing Sync Error (Non-blocking):", syncError)
            }
        }

        // 6. Update Invoice Status
        const { error: updateInvoiceError } = await supabase
            .from('invoices')
            .update({ 
                Status: 'Wait Payment',
                Updated_At: new Date().toISOString()
            })
            .eq('Invoice_ID', invoiceId)

        if (updateInvoiceError) throw updateInvoiceError

        // Log Activity
        await logActivity({
            module: 'Billing',
            action_type: 'UPDATE',
            target_id: invoiceId,
            details: {
                action: 'CONFIRM_VERIFICATION',
                created_bn: billingNoteId,
                job_count: jobs.length
            }
        })

        revalidatePath('/billing/invoices')
        revalidatePath('/billing/customer')

        return { success: true, billingNoteId }

    } catch (error: any) {
        console.error("Confirm Invoice Error:", error)
        return { success: false, error: error.message }
    }
}

export async function voidAndRejectInvoice(invoiceId: string) {
    try {
        const supabase = await createAdminClient()

        // 1. Unlink Jobs first (Safety first)
        const { error: unlinkError } = await supabase
            .from('Jobs_Main')
            .update({ 
                Invoice_ID: null,
                Billing_Note_ID: null 
            })
            .eq('Invoice_ID', invoiceId)

        if (unlinkError) throw unlinkError

        // 2. Delete the Invoice and related Billing Note (if any)
        // Note: Casade delete might handle this if set up, but we'll do it explicitly
        await supabase.from('Billing_Notes').delete().eq('Billing_Note_ID', invoiceId)
        
        const { error: deleteError } = await supabase
            .from('invoices')
            .delete()
            .eq('Invoice_ID', invoiceId)

        if (deleteError) throw deleteError

        // 3. Log Activity
        await logActivity({
            module: 'Billing',
            action_type: 'DELETE',
            target_id: invoiceId,
            details: {
                action: 'VOID_AND_REJECT',
                reason: 'USER_REJECTION'
            }
        })

        revalidatePath('/billing/invoices')
        revalidatePath('/billing/customer')

        return { success: true }
    } catch (error: any) {
        console.error("Void Invoice Error:", error)
        return { success: false, error: error.message }
    }
}
