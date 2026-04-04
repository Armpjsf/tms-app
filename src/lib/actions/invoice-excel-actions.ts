'use server'

import { createAdminClient } from '@/utils/supabase/server'
import ExcelJS from 'exceljs'
import { getSystemSetting } from './system-settings-actions'
import path from 'path'
import fs from 'fs'

export async function exportInvoiceExcel(invoiceId: string) {
    try {
        const supabase = createAdminClient()

        // 1. Get Data
        const { data: invoice } = await supabase.from('invoices').select('*, Master_Customers(*)').eq('Invoice_ID', invoiceId).maybeSingle()
        const { data: bn } = !invoice ? await supabase.from('Billing_Notes').select('*').eq('Billing_Note_ID', invoiceId).maybeSingle() : { data: null }
        const finalDoc = invoice || bn
        if (!finalDoc) throw new Error("ไม่พบข้อมูลเอกสาร")

        // 1.1 Data Source Selection (Snapshot preferred)
        let jobs: any[] = []
        if (invoice?.Items_JSON && Array.isArray(invoice.Items_JSON)) {
            jobs = invoice.Items_JSON
        } else {
            const { data: dbJobs } = await supabase.from('Jobs_Main').select('*').or(`Invoice_ID.eq."${invoiceId}",Billing_Note_ID.eq."${invoiceId}"`)
            jobs = dbJobs || []
        }
        if (!jobs || jobs.length === 0) throw new Error("ไม่พบรายการงาน")

        const accountingProfile = await getSystemSetting('accounting_profile', {
            company_name_th: "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด",
            address: "เลขที่ 99/2 หมู่ที่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000",
            tax_id: "0745559001353 (สำนักงานใหญ่)"
        })

        // 2. Load Template
        // Vercel deployment hardened path hunting logic
        const pathsToTry = [
            path.join(process.cwd(), 'src', 'lib', 'templates', 'invoice_template.xlsx'),
            path.join(process.cwd(), 'public', 'templates', 'invoice_template.xlsx'),
            path.join(process.cwd(), '.next', 'server', 'chunks', 'invoice_template.xlsx'),
            path.resolve(__dirname, 'invoice_template.xlsx'),
        ]

        let templatePath = ""
        for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
                templatePath = p
                break
            }
        }
        
        if (!templatePath) {
            // Ultimate diagnostic if all fail
            const rootFiles = fs.readdirSync(process.cwd()).join(', ')
            throw new Error(`Excel template not found. Tried paths: ${pathsToTry.join(' | ')}. Root files: ${rootFiles}. Current: ${process.cwd()}`)
        }

        const workbook = new ExcelJS.Workbook()
        try {
            const templateBuffer = fs.readFileSync(templatePath)
            await workbook.xlsx.load(templateBuffer)
        } catch (readError: any) {
            throw new Error(`Failed to read/load template: ${readError.message}`)
        }

        const worksheet = workbook.getWorksheet(1)
        if (!worksheet) throw new Error("Worksheet not found in template")

        // 3. Clear Data Area (H10:M27)
        for (let r = 10; r <= 27; r++) {
            for (let c = 8; c <= 13; c++) {
                worksheet.getCell(r, c).value = null
            }
        }

        // 4. Helper Logic for Extra Costs
        const CATEGORIES = {
            EXTRA_DROP: ['extra dropoff', 'เพิ่มจุด', 'drop', 'ต้นทาง', 'ปลายทาง'],
            LABOR: ['labor', 'แรงงาน', 'ยกลง', 'ยกขึ้น', 'เด็กติดรถ'],
            WAIT: ['wait', 'รอลง', 'overtime', 'รอนาน', 'จอดรอ']
        }

        const getCatExtra = (job: any, keywords: string[]) => {
            let costs = job.extra_costs_json
            if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch { return 0 } }
            if (Array.isArray(costs)) {
                return costs
                    .filter((c: any) => keywords.some(k => c.type?.toLowerCase().includes(k.toLowerCase())))
                    .reduce((sum: number, c: any) => sum + (Number(c.charge_cust) || 0), 0)
            }
            return 0
        }

        const getOtherExtra = (job: any) => {
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

        const hasExtraDrop = jobs.some(j => (Number(j.Price_Cust_Extra) || 0) > 0 || getCatExtra(j, CATEGORIES.EXTRA_DROP) > 0)
        const hasLabor = jobs.some(j => (Number(j.Charge_Labor) || 0) > 0 || getCatExtra(j, CATEGORIES.LABOR) > 0)
        const hasWait = jobs.some(j => (Number(j.Charge_Wait) || 0) > 0 || getCatExtra(j, CATEGORIES.WAIT) > 0)
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

        // Smarter Layout: Adaptive widths
        worksheet.getColumn('E').width = 25
        worksheet.getColumn('F').width = 45 

        worksheet.getCell('H7').value = 'ค่าขนส่ง'
        worksheet.getCell('I7').value = hasExtraDrop ? 'เพิ่มจุดลงของ' : '-'
        worksheet.getCell('J7').value = hasLabor ? 'แรงงานยกของ' : '-'
        worksheet.getCell('K7').value = hasWait ? 'รอลงเกินเวลา' : '-'
        worksheet.getCell('L7').value = hasOther ? 'พาเลท/อื่นๆ' : '-'

        // 6. Fill Data with Dynamic Row Adjustment
        const summaryTotals = { base: 0, extra: 0, labor: 0, wait: 0, other: 0, grand: 0 }

        jobs.forEach((job, index) => {
            const r = 10 + index
            if (r > 26) return

            const row = worksheet.getRow(r)
            const destText = String(job.Dest_Location || job.Route_Name || '')
            const originText = String(job.Origin_Location || '')
            const maxLen = Math.max(destText.length, originText.length)
            
            // Dynamic Height Logic: Grow only for long text
            row.height = maxLen > 30 ? Math.ceil(maxLen / 35) * 15 + 10 : 20

            worksheet.getCell(`A${r}`).value = index + 1
            worksheet.getCell(`B${r}`).value = new Date(job.Plan_Date).toLocaleDateString('th-TH')
            worksheet.getCell(`C${r}`).value = job.Vehicle_Type || '-'
            worksheet.getCell(`D${r}`).value = Number(job.Total_Drop || 1)
            worksheet.getCell(`E${r}`).value = originText || '-'
            worksheet.getCell(`F${r}`).value = destText || '-'
            worksheet.getCell(`G${r}`).value = Number(((Number(job.Est_Distance_KM) || 0) * 0.12).toFixed(2))

            // 6.2 Pricing Math (Total = Base + Extras)
            // Fix: Fallback to calculated price if Price_Cust_Total is zero or missing
            let baseFreight = Number(job.Price_Cust_Total || 0)
            
            if (baseFreight === 0) {
                const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 1)
                const unitPrice = Number(job.Price_Per_Unit || 0)
                if (unitPrice > 0) {
                    baseFreight = Number((qty * unitPrice).toFixed(2))
                }
            }

            const extraDrop = hasExtraDrop ? (Number(job.Price_Cust_Extra || 0) + getCatExtra(job, CATEGORIES.EXTRA_DROP)) : 0
            const labor = hasLabor ? (Number(job.Charge_Labor || 0) + getCatExtra(job, CATEGORIES.LABOR)) : 0
            const waitTime = hasWait ? (Number(job.Charge_Wait || 0) + getCatExtra(job, CATEGORIES.WAIT)) : 0
            const other = hasOther ? (Number(job.Price_Cust_Other || 0) + getOtherExtra(job)) : 0

            // Grand Total is sum of base + all extras
            const grandTotal = baseFreight + extraDrop + labor + waitTime + other

            worksheet.getCell(`H${r}`).value = baseFreight > 0 ? baseFreight : null
            worksheet.getCell(`I${r}`).value = extraDrop > 0 ? extraDrop : null
            worksheet.getCell(`J${r}`).value = labor > 0 ? labor : null
            worksheet.getCell(`K${r}`).value = waitTime > 0 ? waitTime : null
            worksheet.getCell(`L${r}`).value = other > 0 ? other : null
            worksheet.getCell(`M${r}`).value = grandTotal

            // Column Totals Accumulation
            summaryTotals.base += baseFreight
            summaryTotals.extra += extraDrop
            summaryTotals.labor += labor
            summaryTotals.wait += waitTime
            summaryTotals.other += other
            summaryTotals.grand += grandTotal

            // Group styling
            ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
                const cell = worksheet.getCell(`${col}${r}`)
                cell.alignment = { wrapText: true, vertical: 'top', horizontal: ['A', 'D', 'G'].includes(col) ? 'center' : 'left' }
                if (['H', 'I', 'J', 'K', 'L', 'M'].includes(col)) {
                    cell.numFmt = '#,##0.00'
                    cell.alignment = { ...cell.alignment, horizontal: 'right' }
                }
            })
        })

        // 7. Write Summary Row (27)
        worksheet.getCell('H27').value = summaryTotals.base
        worksheet.getCell('I27').value = summaryTotals.extra
        worksheet.getCell('J27').value = summaryTotals.labor
        worksheet.getCell('K27').value = summaryTotals.wait
        worksheet.getCell('L27').value = summaryTotals.other
        worksheet.getCell('M27').value = summaryTotals.grand

        ;['H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
            worksheet.getCell(`${col}27`).numFmt = '#,##0.00'
            worksheet.getCell(`${col}27`).alignment = { horizontal: 'right' }
        })

        // 8. Output
        const buffer = await workbook.xlsx.writeBuffer()
        return { success: true, data: Buffer.from(buffer).toString('base64'), fileName: `Invoice_${finalDoc.Invoice_ID || finalDoc.Billing_Note_ID}.xlsx` }

    } catch (error: any) {
        console.error("Excel Export Error:", error)
        return { success: false, error: error.message }
    }
}
