'use server'

import { createAdminClient } from '@/utils/supabase/server'
import ExcelJS from 'exceljs'
import { getSystemSetting } from './system-settings-actions'
import { INVOICE_TEMPLATE_BASE64 } from '../templates/invoice_template_base64'

export async function exportInvoiceExcel(invoiceId: string) {
    try {
        const supabase = createAdminClient()

        // 1. Get Data
        const { data: invoice } = await supabase.from('invoices').select('*, Master_Customers(*)').eq('Invoice_ID', invoiceId).maybeSingle()
        const { data: bn } = !invoice ? await supabase.from('Billing_Notes').select('*').eq('Billing_Note_ID', invoiceId).maybeSingle() : { data: null }
        const finalDoc = invoice || bn
        if (!finalDoc) throw new Error("ไม่พบข้อมูลเอกสาร")

        const { data: jobs } = await supabase.from('Jobs_Main').select('*').or(`Invoice_ID.eq."${invoiceId}",Billing_Note_ID.eq."${invoiceId}"`)
        if (!jobs || jobs.length === 0) throw new Error("ไม่พบรายการงาน")

        const accountingProfile = await getSystemSetting('accounting_profile', {
            company_name_th: "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด",
            address: "เลขที่ 99/2 หมู่ที่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000",
            tax_id: "0745559001353 (สำนักงานใหญ่)"
        })

        // 2. Load Template (Vercel Fix: Use Embedded Base64 Asset)
        const workbook = new ExcelJS.Workbook()
        try {
            const templateBuffer = Buffer.from(INVOICE_TEMPLATE_BASE64, 'base64')
            await workbook.xlsx.load(templateBuffer)
        } catch (readError: any) {
            console.error("[DEBUG] Failed to load template buffer:", readError.message)
            throw new Error("ระบบไม่สามารถประมวลผลไฟล์แม่แบบได้")
        }
        
        const worksheet = workbook.getWorksheet(1)
        if (!worksheet) throw new Error("Worksheet not found")

        // 3. Clear Data Area (To prevent Shared Formula errors)
        for (let r = 10; r <= 27; r++) {
            for (let c = 8; c <= 13; c++) {
                worksheet.getCell(r, c).value = null
            }
        }

        // 4. Helper for Extra Costs Data
        const CATEGORIES = {
            EXTRA_DROP: ['extra dropoff', 'เพิ่มจุด'],
            LABOR: ['labor', 'แรงงาน'],
            WAIT: ['wait', 'รอลง', 'overtime']
        }

        function getExtraJsonValue(job: any, keywords: string[]) {
            if (!job.extra_costs_json) return 0
            let costs = job.extra_costs_json
            if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch { return 0 } }
            if (Array.isArray(costs)) {
                return costs
                    .filter((c: any) => keywords.some(k => c.type?.toLowerCase().includes(k.toLowerCase())))
                    .reduce((sum: number, c: any) => sum + (Number(c.charge_cust) || 0), 0)
            }
            return 0
        }

        function getOtherExtra(job: any) {
            if (!job.extra_costs_json) return 0
            let costs = job.extra_costs_json
            if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch { return 0 } }
            if (Array.isArray(costs)) {
                const allKeywords = [...CATEGORIES.EXTRA_DROP, ...CATEGORIES.LABOR, ...CATEGORIES.WAIT]
                return costs
                    .filter((c: any) => !allKeywords.some(k => c.type?.toLowerCase().includes(k.toLowerCase())))
                    .reduce((sum: number, c: any) => sum + (Number(c.charge_cust) || 0), 0)
            }
            return 0
        }

        // Identify categories
        const hasExtraDrop = jobs.some(j => (Number(j.Price_Cust_Extra) || 0) > 0 || getExtraJsonValue(j, CATEGORIES.EXTRA_DROP) > 0)
        const hasLabor = jobs.some(j => (Number(j.Charge_Labor) || 0) > 0 || getExtraJsonValue(j, CATEGORIES.LABOR) > 0)
        const hasWait = jobs.some(j => (Number(j.Charge_Wait) || 0) > 0 || getExtraJsonValue(j, CATEGORIES.WAIT) > 0)
        const hasOther = jobs.some(j => (Number(j.Price_Cust_Other) || 0) > 0 || getOtherExtra(j) > 0)

        // 5. Fill Headers
        worksheet.getCell('C3').value = accountingProfile.company_name_th
        worksheet.getCell('C5').value = accountingProfile.address
        worksheet.getCell('A6').value = `เลขที่ประจำตัวผู้เสียภาษี : ${accountingProfile.tax_id}`
        
        const docDate = new Date(finalDoc.Issue_Date || finalDoc.Billing_Date).toLocaleDateString('th-TH')
        worksheet.getCell('H3').value = `วันที่ ${docDate}`
        worksheet.getCell('K3').value = `เลขที่ ${finalDoc.Invoice_ID || finalDoc.Billing_Note_ID}`
        
        worksheet.getCell('I4').value = finalDoc.Master_Customers?.Customer_Name || finalDoc.Customer_Name || '-'
        worksheet.getCell('I5').value = finalDoc.Master_Customers?.Address || finalDoc.Customer_Address || '-'
        worksheet.getCell('H6').value = `เลขที่ประจำตัวผู้เสียภาษี :  ${finalDoc.Master_Customers?.Tax_ID || finalDoc.Customer_Tax_ID || '-'}`

        // Dynamic Table Headers (H7 to L7)
        worksheet.getCell('H7').value = 'ค่าจ้าง'
        worksheet.getCell('I7').value = hasExtraDrop ? 'เพิ่มจุดลงของ' : '-'
        worksheet.getCell('J7').value = hasLabor ? 'แรงงานยกของ' : '-'
        worksheet.getCell('K7').value = hasWait ? 'รอลงเกินเวลา' : '-'
        worksheet.getCell('L7').value = hasOther ? 'อื่นๆ' : '-'
        worksheet.getCell('M7').value = 'ค่าจ้างรวม'

        // 6. Fill Job Data (Rows 10 to 26)
        const summaryTotals = { base: 0, extra: 0, labor: 0, wait: 0, other: 0, grand: 0 }

        jobs.forEach((job, index) => {
            const r = 10 + index
            if (r > 26) return

            worksheet.getCell(`A${r}`).value = index + 1
            worksheet.getCell(`B${r}`).value = new Date(job.Plan_Date).toLocaleDateString('th-TH')
            worksheet.getCell(`C${r}`).value = job.Vehicle_Type || '-'
            worksheet.getCell(`D${r}`).value = Number(job.Total_Drop || 1)
            worksheet.getCell(`E${r}`).value = job.Origin_Location || '-'
            worksheet.getCell(`F${r}`).value = job.Dest_Location || job.Route_Name || '-'
            
            const co2 = Number(((Number(job.Est_Distance_KM) || 0) * 0.12).toFixed(2))
            worksheet.getCell(`G${r}`).value = co2
            
            const basePrice = Number(job.Price_Cust_Total || 0)
            const extraDrop = hasExtraDrop ? (Number(job.Price_Cust_Extra || 0) + getExtraJsonValue(job, CATEGORIES.EXTRA_DROP)) : 0
            const labor = hasLabor ? (Number(job.Charge_Labor || 0) + getExtraJsonValue(job, CATEGORIES.LABOR)) : 0
            const waitTime = hasWait ? (Number(job.Charge_Wait || 0) + getExtraJsonValue(job, CATEGORIES.WAIT)) : 0
            const other = hasOther ? (Number(job.Price_Cust_Other || 0) + getOtherExtra(job)) : 0

            const rowTotal = basePrice + extraDrop + labor + waitTime + other

            worksheet.getCell(`H${r}`).value = basePrice > 0 ? basePrice : null
            worksheet.getCell(`I${r}`).value = extraDrop > 0 ? extraDrop : null
            worksheet.getCell(`J${r}`).value = labor > 0 ? labor : null
            worksheet.getCell(`K${r}`).value = waitTime > 0 ? waitTime : null
            worksheet.getCell(`L${r}`).value = other > 0 ? other : null
            worksheet.getCell(`M${r}`).value = rowTotal
            
            // Accumulate totals
            summaryTotals.base += basePrice
            summaryTotals.extra += extraDrop
            summaryTotals.labor += labor
            summaryTotals.wait += waitTime
            summaryTotals.other += other
            summaryTotals.grand += rowTotal

            // Apply number format
            ;['H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
                const cell = worksheet.getCell(`${col}${r}`)
                cell.numFmt = '#,##0.00'
            })
        })

        // 7. Summary Totals (Row 27)
        worksheet.getCell('H27').value = summaryTotals.base
        worksheet.getCell('I27').value = summaryTotals.extra
        worksheet.getCell('J27').value = summaryTotals.labor
        worksheet.getCell('K27').value = summaryTotals.wait
        worksheet.getCell('L27').value = summaryTotals.other
        worksheet.getCell('M27').value = summaryTotals.grand

        ;['H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
            worksheet.getCell(`${col}27`).numFmt = '#,##0.00'
        })

        // 8. Write to Buffer and Return as Base64
        const buffer = await workbook.xlsx.writeBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        
        return { success: true, data: base64, fileName: `Invoice_${invoiceId}.xlsx` }

    } catch (error: any) {
        console.error("Excel Export Error:", error)
        return { success: false, error: error.message }
    }
}
