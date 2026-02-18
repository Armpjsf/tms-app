"use server"

import { createClient } from "@/utils/supabase/server"
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export interface BillingNote {
  Billing_Note_ID: string
  Customer_Name: string
  Billing_Date: string
  Due_Date: string | null
  Total_Amount: number
  Status: string
  Created_At: string
  Updated_At: string
  Customer_Email?: string
  Customer_Address?: string
  Customer_Tax_ID?: string
}

export async function createBillingNote(
    jobIds: string[], 
    customerName: string, 
    date: string,
    dueDate?: string
) {
    try {
        const supabase = await createClient()

        // 1. Calculate Total Amount
        const { data: jobs, error: jobsError } = await supabase
            .from('Jobs_Main')
            .select('Price_Cust_Total, extra_costs_json')
            .in('Job_ID', jobIds)

        if (jobsError) throw new Error("Failed to fetch jobs for calculation")
        
        const totalAmount = jobs?.reduce((sum, job) => {
             const basePrice = job.Price_Cust_Total || 0
             let extra = 0
             
             if (job.extra_costs_json) {
                 try {
                     let costs = job.extra_costs_json
                     if (typeof costs === 'string') {
                        try { costs = JSON.parse(costs) } catch {}
                     }
                     // Handle double stringification if necessary
                     if (typeof costs === 'string') {
                        try { costs = JSON.parse(costs) } catch {}
                     }
                     
                     if (Array.isArray(costs)) {
                         extra = costs.reduce((cHigh: number, c: any) => cHigh + (Number(c.charge_cust) || 0), 0)
                     }
                 } catch (e) {
                     console.error("Error parsing extra costs for job", job, e)
                 }
             }

             return sum + basePrice + extra
        }, 0) || 0

        // 2. Generate Billing Note ID (BN-YYYYMM-XXXX)
        const dateObj = new Date()
        const ym = dateObj.toISOString().slice(0, 7).replace('-', '') // 202402
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const billingNoteId = `BN-${ym}-${randomSuffix}`

        // 3. Insert Billing Note
        // 3. Insert Billing Note
        const branchId = await getUserBranchId()

        const { error: insertError } = await supabase
            .from('Billing_Notes')
            .insert({
                Billing_Note_ID: billingNoteId,
                Customer_Name: customerName,
                Billing_Date: date,
                Due_Date: dueDate || null,
                Total_Amount: totalAmount,
                Status: 'Pending',
                Created_At: new Date().toISOString(),
                Updated_At: new Date().toISOString()
            })

        if (insertError) throw insertError

        // 4. Update Jobs with Billing Note ID
        const { error: updateError } = await supabase
            .from('Jobs_Main')
            .update({ Billing_Note_ID: billingNoteId })
            .in('Job_ID', jobIds)

        if (updateError) {
             // Rollback (Optional: Delete created billing note if critical)
             console.error("Failed to link jobs to billing note")
             throw updateError
        }

        return { success: true, id: billingNoteId }

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error("createBillingNote Error:", e)
        return { success: false, error: message }
    }
}

export async function createDriverPayment(
    jobIds: string[], 
    driverName: string, 
    date: string
) {
    try {
        const supabase = await createClient()

        // 1. Calculate Total Amount
        const { data: jobs, error: jobsError } = await supabase
            .from('Jobs_Main')
            .select('Cost_Driver_Total')
            .in('Job_ID', jobIds)

        if (jobsError) throw new Error("Failed to fetch jobs for calculation")
        
        const totalAmount = jobs?.reduce((sum, job) => sum + (job.Cost_Driver_Total || 0), 0) || 0

        // 2. Generate Driver Payment ID (DP-YYYYMM-XXXX)
        const dateObj = new Date()
        const ym = dateObj.toISOString().slice(0, 7).replace('-', '') // 202402
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const paymentId = `DP-${ym}-${randomSuffix}`

        // 3. Insert Driver Payment
        const { error: insertError } = await supabase
            .from('Driver_Payments')
            .insert({
                Driver_Payment_ID: paymentId,
                Driver_Name: driverName,
                Payment_Date: date,
                Total_Amount: totalAmount,
                Status: 'Pending',
                Created_At: new Date().toISOString(),
                Updated_At: new Date().toISOString()
            })

        if (insertError) throw insertError

        // 4. Update Jobs with Driver Payment ID
        const { error: updateError } = await supabase
            .from('Jobs_Main')
            .update({ Driver_Payment_ID: paymentId })
            .in('Job_ID', jobIds)

        if (updateError) {
             console.error("Failed to link jobs to driver payment")
             throw updateError
        }

        return { success: true, id: paymentId }

    } catch {
        console.error("createDriverPayment Error")
        return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
    }
}

export async function getBillingNotes() {
    try {
        const supabase = await createClient()
        
        // Filter by Branch
        const branchId = await getUserBranchId()
        const isAdmin = await isSuperAdmin()
        
        let query = supabase.from('Billing_Notes').select('*')
        
        if (branchId && !isAdmin) {
            // @ts-ignore
            query = query.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data, error } = await query
            .order('Created_At', { ascending: false })
        
        if (error) {
            console.error("Error fetching billing notes:", error)
            return []
        }
        return data as BillingNote[]
    } catch (e) {
        return []
    }
}

export interface BillingNote {
  Billing_Note_ID: string
  Customer_Name: string
  Billing_Date: string
  Due_Date: string | null
  Total_Amount: number
  Status: string
  Created_At: string
  Updated_At: string
  Customer_Email?: string
  Customer_Address?: string
  Customer_Tax_ID?: string
}

// ... (in createBillingNote, createDriverPayment, getBillingNotes - unchanged)

export async function getBillingNoteByIdWithJobs(id: string) {
    try {
        const supabase = await createClient()
        
        // 1. Get Billing Note
        const { data: note, error: noteError } = await supabase
            .from('Billing_Notes')
            .select('*')
            .eq('Billing_Note_ID', id)
            .single()
        
        if (noteError) throw noteError

        // 2. Get Associated Jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('Jobs_Main')
            .select('*, extra_costs_json')
            .eq('Billing_Note_ID', id)
        
        if (jobsError) throw jobsError

        // 3. Get Company Profile
        const { data: profileData } = await supabase
            .from('System_Settings')
            .select('value')
            .eq('key', 'company_profile')
            .single()

        let companyProfile = null
        if (profileData?.value) {
            try {
                companyProfile = typeof profileData.value === 'string' ? JSON.parse(profileData.value) : profileData.value
            } catch (e) {
                console.error("Error parsing company profile:", e)
            }
        }

        // 4. Get Customer Details
        let customerEmail = ""
        let customerAddress = ""
        let customerTaxId = ""

        if (note && note.Customer_Name) {
            // Note: Email is not in Master_Customers schema provided by user.
            const { data: customer, error: custError } = await supabase
                .from('Master_Customers')
                .select('Address, Tax_ID') 
                .eq('Customer_Name', note.Customer_Name)
                .limit(1) // Safely handle duplicates by taking the first one
                .maybeSingle()
            
            if (custError) {
                console.error("Error fetching Customer for Billing:", custError)
            }

            if (customer) {
                // customerEmail = customer.Email // Column doesn't exist
                customerAddress = customer.Address
                customerTaxId = customer.Tax_ID
            } else {
                console.warn(`Customer '${note.Customer_Name}' not found in Master_Customers`)
            }
        }

        const billingNoteWithDetails: BillingNote = {
            ...note as BillingNote,
            Customer_Email: customerEmail,
            Customer_Address: customerAddress,
            Customer_Tax_ID: customerTaxId
        }

        return { note: billingNoteWithDetails, jobs: jobs || [], company: companyProfile }

    } catch (e) {
        console.error("Error fetching billing note details:", e)
        return null
    }
}

export interface DriverPayment {
    Driver_Payment_ID: string
    Driver_Name: string
    Payment_Date: string
    Total_Amount: number
    Status: string
    Created_At: string
    Updated_At: string
}

export async function getDriverPayments() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Driver_Payments')
            .select('*')
            .order('Created_At', { ascending: false })
        
        if (error) {
            console.error("Error fetching driver payments:", error)
            return []
        }
        return data as DriverPayment[]
    } catch {
        return []
    }
}

export async function updateBillingNoteStatus(id: string, status: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('Billing_Notes')
            .update({ 
                Status: status,
                Updated_At: new Date().toISOString()
            })
            .eq('Billing_Note_ID', id)

        if (error) throw error
        return { success: true }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error("updateBillingNoteStatus Error:", e)
        return { success: false, error: message }
    }
}

export async function updateDriverPaymentStatus(id: string, status: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('Driver_Payments')
            .update({ 
                Status: status,
                Updated_At: new Date().toISOString()
            })
            .eq('Driver_Payment_ID', id)

        if (error) throw error
        return { success: true }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error("updateDriverPaymentStatus Error:", e)
        return { success: false, error: message }
    }
}

export async function recallBillingNote(id: string) {
    try {
        const isAdmin = await isSuperAdmin()
        if (!isAdmin) throw new Error("Only SuperAdmins can recall billing notes")

        const supabase = await createClient()

        // 1. Unlink jobs
        const { error: unlinkError } = await supabase
            .from('Jobs_Main')
            .update({ Billing_Note_ID: null })
            .eq('Billing_Note_ID', id)

        if (unlinkError) throw unlinkError

        // 2. Delete billing note
        const { error: deleteError } = await supabase
            .from('Billing_Notes')
            .delete()
            .eq('Billing_Note_ID', id)

        if (deleteError) throw deleteError

        return { success: true }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error("recallBillingNote Error:", e)
        return { success: false, error: message }
    }
}

export async function recallDriverPayment(id: string) {
    try {
        const isAdmin = await isSuperAdmin()
        if (!isAdmin) throw new Error("Only SuperAdmins can recall payments")

        const supabase = await createClient()

        // 1. Unlink jobs
        const { error: unlinkError } = await supabase
            .from('Jobs_Main')
            .update({ Driver_Payment_ID: null })
            .eq('Driver_Payment_ID', id)

        if (unlinkError) throw unlinkError

        // 2. Delete payment
        const { error: deleteError } = await supabase
            .from('Driver_Payments')
            .delete()
            .eq('Driver_Payment_ID', id)

        if (deleteError) throw deleteError

        return { success: true }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error("recallDriverPayment Error:", e)
        return { success: false, error: message }
    }
}
