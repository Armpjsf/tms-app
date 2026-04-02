'use server'

import { createAdminClient } from '@/utils/supabase/server'
import * as XLSX from 'xlsx'
import { getSystemSetting } from './system-settings-actions'

interface ExtraCost {
    type: string
    charge_cust: number
}

interface Job {
    Job_ID: string
    Plan_Date: string
    Vehicle_Type: string
    Total_Drop: number
    Origin_Location: string
    Dest_Location: string
    Est_Distance_KM?: number
    Price_Cust_Total: number
    extra_costs_json?: any
    Charge_Labor?: number
    Charge_Wait?: number
    Price_Cust_Other?: number
}

export async function exportInvoiceExcel(invoiceId: string) {
    try {
        const supabase = createAdminClient()

        // 1. Get Invoice Data
        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .select('*, Master_Customers(*)')
            .eq('Invoice_ID', invoiceId)
            .single()

        if (invError || !invoice) throw new Error("Invoice not found")

        // 2. Get Jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Invoice_ID', invoiceId)

        if (jobsError) throw jobsError

        // 3. Get Accounting Profile
        const accountingProfile = await getSystemSetting('accounting_profile', {
            company_name_th: "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด",
            address: "เลขที่ 99/2 หมู่ที่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000",
            tax_id: "0745559001353 (สำนักงานใหญ่)"
        })

        // 4. Prepare Data & Dynamic Columns
        const hasLabor = jobs.some(j => (j.Charge_Labor || 0) > 0 || checkExtra(j, 'Labor'))
        const hasWait = jobs.some(j => (j.Charge_Wait || 0) > 0 || checkExtra(j, 'Wait') || checkExtra(j, 'Overtime'))
        const hasExtraDrop = jobs.some(j => checkExtra(j, 'Extra Dropoff') || checkExtra(j, 'เพิ่มจุดลงของ'))
        const hasOther = jobs.some(j => (j.Price_Cust_Other || 0) > 0 || checkExtra(j, 'Other'))

        // Helper to check extra_costs_json
        function checkExtra(job: any, type: string) {
            if (!job.extra_costs_json) return false
            let costs = job.extra_costs_json
            if (typeof costs === 'string') {
                try { costs = JSON.parse(costs) } catch { return false }
            }
            if (Array.isArray(costs)) {
                return costs.some((c: any) => c.type?.toLowerCase().includes(type.toLowerCase()) && (c.charge_cust || 0) > 0)
            }
            return false
        }

        function getExtraValue(job: any, type: string) {
            if (!job.extra_costs_json) return 0
            let costs = job.extra_costs_json
            if (typeof costs === 'string') {
                try { costs = JSON.parse(costs) } catch { return 0 }
            }
            if (Array.isArray(costs)) {
                return costs
                    .filter((c: any) => c.type?.toLowerCase().includes(type.toLowerCase()))
                    .reduce((sum: number, c: any) => sum + (Number(c.charge_cust) || 0), 0)
            }
            return 0
        }

        // Header Rows (Matching Sample)
        const rows: any[][] = [
            ['ต้นฉบับ'],
            ['ใบแจ้งหนี้ ค่าขนส่ง '],
            ['', '', accountingProfile.company_name_th, '', '', '', '', 'วันที่ ' + new Date(invoice.Issue_Date).toLocaleDateString('th-TH'), '', '', 'เลขที่ ' + invoice.Invoice_ID],
            ['', '', '', '', '', '', '', 'ชื่อลูกค้า', invoice.Master_Customers?.Customer_Name || invoice.Customer_Name],
            ['', '', accountingProfile.address, '', '', '', '', 'ที่อยู่', invoice.Master_Customers?.Address || '-'],
            [`เลขที่ประจำตัวผู้เสียภาษี : ${accountingProfile.tax_id}`, '', '', '', '', '', '', 'เลขที่ประจำตัวผู้เสียภาษี : ' + (invoice.Master_Customers?.Tax_ID || '-')],
            [] // Spacer
        ]

        // Dynamic Table Headers
        const tableHeader = [
            'ลำดับ',
            'วันที่',
            'ประเภทรถ',
            'จำนวนจุดลงสินค้า',
            'ต้นทาง',
            'ปลายทาง',
            'ปริมาณคาร์บอนฟุตพริ้น (kgCO2e)',
            'ค่าจ้าง'
        ]

        if (hasExtraDrop) tableHeader.push('เพิ่มจุดลงของ')
        if (hasLabor) tableHeader.push('แรงงานยกของ')
        if (hasWait) tableHeader.push('รอลงเกินเวลา')
        if (hasOther) tableHeader.push('อื่นๆ')
        
        tableHeader.push('ค่าจ้างรวม')
        rows.push(tableHeader)

        // Job Rows
        jobs.forEach((job, index) => {
            const row = [
                index + 1,
                new Date(job.Plan_Date).toLocaleDateString('th-TH'),
                job.Vehicle_Type || '-',
                job.Total_Drop || 1,
                job.Origin_Location || '-',
                job.Dest_Location || job.Route_Name || '-',
                (Number(job.Est_Distance_KM) || 0) * 0.12, // CO2 formula
                job.Price_Cust_Total || 0
            ]

            if (hasExtraDrop) row.push(getExtraValue(job, 'Extra Dropoff') + getExtraValue(job, 'เพิ่มจุดลงของ'))
            if (hasLabor) row.push((job.Charge_Labor || 0) + getExtraValue(job, 'Labor'))
            if (hasWait) row.push((job.Charge_Wait || 0) + getExtraValue(job, 'Wait') + getExtraValue(job, 'Overtime'))
            if (hasOther) row.push((job.Price_Cust_Other || 0) + getExtraValue(job, 'Other') + getExtraValue(job, 'Expressway') + getExtraValue(job, 'Parking'))
            
            // Total for this job
            const total = Number(row[7]) + 
                         (hasExtraDrop ? Number(row[tableHeader.indexOf('เพิ่มจุดลงของ')]) : 0) +
                         (hasLabor ? Number(row[tableHeader.indexOf('แรงงานยกของ')]) : 0) +
                         (hasWait ? Number(row[tableHeader.indexOf('รอลงเกินเวลา')]) : 0) +
                         (hasOther ? Number(row[tableHeader.indexOf('อื่นๆ')]) : 0)
            
            row.push(total)
            rows.push(row)
        })

        // Footer / Summary
        rows.push([])
        const totalRow = new Array(tableHeader.length).fill('')
        totalRow[tableHeader.length - 2] = 'รวมเงินทั้งสิ้น'
        totalRow[tableHeader.length - 1] = invoice.Grand_Total
        rows.push(totalRow)

        // Create Workbook
        const worksheet = XLSX.utils.aoa_to_sheet(rows)
        
        // Basic Styling (Column Widths)
        const colWidths = [
            { wch: 6 },  // No
            { wch: 12 }, // Date
            { wch: 15 }, // Vehicle Type
            { wch: 15 }, // Drops
            { wch: 25 }, // Origin
            { wch: 25 }, // Destination
            { wch: 20 }, // CO2
            { wch: 12 }, // Price
        ]
        // Add widths for dynamic columns
        if (hasExtraDrop) colWidths.push({ wch: 12 })
        if (hasLabor) colWidths.push({ wch: 12 })
        if (hasWait) colWidths.push({ wch: 12 })
        if (hasOther) colWidths.push({ wch: 12 })
        colWidths.push({ wch: 15 }) // Total

        worksheet['!cols'] = colWidths

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice')

        // Generate Base64
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
        
        return { success: true, data: excelBuffer, fileName: `Invoice_${invoiceId}.xlsx` }

    } catch (error: any) {
        console.error("Excel Export Error:", error)
        return { success: false, error: error.message }
    }
}
