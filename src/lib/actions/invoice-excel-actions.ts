'use server'

import { createAdminClient } from '@/utils/supabase/server'
import ExcelJS from 'exceljs'
import { getSystemSetting } from './system-settings-actions'
import { INVOICE_TEMPLATE_BASE64 } from '../templates/invoice_template_base64'

// 4. Localization: Map for English keys to Thai labels
const EXPENSE_MAP: Record<string, string> = {
    'Labor': 'แรงงานยกของ',
    'Extra Dropoff': 'เพิ่มจุดลงของ',
    'Wait': 'รอลงเกินเวลา',
    'Overtime': 'รอลงเกินเวลา',
    'Expressway': 'ค่าทางด่วน',
    'Parking': 'ค่าจอดรถ',
    'Other': 'อื่นๆ',
    'Fuel Surcharge': 'เซอร์ชาร์จน้ำมัน',
    'Price_Cust_Extra': 'เพิ่มจุดลงของ',
    'Charge_Labor': 'แรงงานยกของ',
    'Charge_Wait': 'รอลงเกินเวลา',
    'Price_Cust_Other': 'อื่นๆ'
}

export async function exportInvoiceExcel(invoiceId: string) {
    try {
        const supabase = createAdminClient()

        // 1. Get Data
        const { data: invoice } = await supabase.from('invoices').select('*, Master_Customers(*)').eq('Invoice_ID', invoiceId).maybeSingle()
        const { data: bn } = !invoice ? await supabase.from('Billing_Notes').select('*').eq('Billing_Note_ID', invoiceId).maybeSingle() : { data: null }
        const finalDoc = invoice || bn
        if (!finalDoc) throw new Error("ไม่พบข้อมูลเอกสาร")

        let jobs: any[] = []
        if (invoice?.Items_JSON && Array.isArray(invoice.Items_JSON)) {
            jobs = invoice.Items_JSON
        } else {
            const { data: dbJobs } = await supabase.from('Jobs_Main').select('*').or(`Invoice_ID.eq."${invoiceId}",Billing_Note_ID.eq."${invoiceId}"`)
            jobs = dbJobs || []
        }
        if (!jobs || jobs.length === 0) throw new Error("ไม่พบรายการงาน")

        const customerId = finalDoc.Customer_ID || jobs[0].Customer_ID
        const { data: customer } = await supabase.from('Master_Customers').select('Price_Per_Unit').eq('Customer_ID', customerId).maybeSingle()
        const customerUnitPrice = customer?.Price_Per_Unit || 0

        const accountingProfile = await getSystemSetting('accounting_profile', {
            company_name_th: "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด",
            address: "เลขที่ 99/2 หมู่ที่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000",
            tax_id: "0745559001353 (สำนักงานใหญ่)"
        })

        // 2. Load Template (Vercel Fix: Embedded Base64)
        const workbook = new ExcelJS.Workbook()
        const templateBuffer = Buffer.from(INVOICE_TEMPLATE_BASE64, 'base64')
        await workbook.xlsx.load(templateBuffer)
        const worksheet = workbook.getWorksheet(1)
        if (!worksheet) throw new Error("Worksheet not found")

        // 3. Clear Dynamic Range ONLY (Protect Main Headers)
        // Clear only I7-L7 (Dynamic headers)
        for (let c = 9; c <= 12; c++) { worksheet.getRow(7).getCell(c).value = null }
        // Clear data rows 10-26
        for (let r = 10; r <= 26; r++) {
            const row = worksheet.getRow(r)
            for (let c = 1; c <= 13; c++) { row.getCell(c).value = null }
        }

        // 4. Identify Extra Cost Types (Thai labels)
        const extraTypesSet = new Set<string>()
        jobs.forEach(job => {
            ['Price_Cust_Extra', 'Charge_Labor', 'Charge_Wait', 'Price_Cust_Other'].forEach(col => {
                if (Number(job[col]) > 0) {
                    extraTypesSet.add(EXPENSE_MAP[col])
                }
            })
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch {} }
                if (Array.isArray(costs)) {
                    costs.forEach((c: any) => {
                        if (c.type && (Number(c.charge_cust) || 0) > 0) {
                            extraTypesSet.add(EXPENSE_MAP[c.type] || c.type)
                        }
                    })
                }
            }
        })

        const allExtraTypes = Array.from(extraTypesSet).slice(0, 4)
        const columnMap: Record<string, number> = {}
        const headerRow = worksheet.getRow(7)
        
        for (let i = 0; i < 4; i++) {
            const colIndex = 9 + i 
            const typeName = allExtraTypes[i]
            const cell = headerRow.getCell(colIndex)
            if (typeName) {
                cell.value = typeName
                columnMap[typeName] = colIndex
            } else {
                cell.value = '-'
            }
            cell.font = { name: 'Sarabun', bold: true, size: 10 }
        }

        // 5. Fill Job Data
        const summaryTotals: any = { 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 }

        jobs.forEach((job, index) => {
            const r = 10 + index
            if (r > 26) return
            const row = worksheet.getRow(r)

            row.getCell(1).value = index + 1
            row.getCell(2).value = job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'
            row.getCell(3).value = job.Vehicle_Type || '-'
            row.getCell(4).value = Number(job.Total_Drop || 1)
            row.getCell(5).value = job.Origin_Location || '-'
            row.getCell(6).value = job.Dest_Location || job.Route_Name || '-'
            row.getCell(7).value = Number(((Number(job.Est_Distance_KM) || 0) * 0.12).toFixed(2))

            let basePrice = Number(job.Price_Cust_Total || 0)
            if (basePrice === 0) {
                const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 0)
                const unitPrice = Number(job.Price_Per_Unit || customerUnitPrice)
                if (unitPrice > 0 && qty > 0) basePrice = Number((qty * unitPrice).toFixed(2))
            }
            row.getCell(8).value = basePrice
            summaryTotals[8] += basePrice

            const jobExtras: Record<number, number> = { 9: 0, 10: 0, 11: 0, 12: 0 }
            if (Number(job.Price_Cust_Extra) > 0) jobExtras[columnMap[EXPENSE_MAP['Price_Cust_Extra']] || 12] += Number(job.Price_Cust_Extra)
            if (Number(job.Charge_Labor) > 0) jobExtras[columnMap[EXPENSE_MAP['Charge_Labor']] || 12] += Number(job.Charge_Labor)
            if (Number(job.Charge_Wait) > 0) jobExtras[columnMap[EXPENSE_MAP['Charge_Wait']] || 12] += Number(job.Charge_Wait)
            if (Number(job.Price_Cust_Other) > 0) jobExtras[columnMap[EXPENSE_MAP['Price_Cust_Other']] || 12] += Number(job.Price_Cust_Other)

            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch {} }
                if (Array.isArray(costs)) {
                    costs.forEach((c: any) => {
                        const val = Number(c.charge_cust) || 0
                        const thName = EXPENSE_MAP[c.type] || c.type
                        if (val > 0) {
                            const colIdx = columnMap[thName] || 12
                            jobExtras[colIdx] += val
                        }
                    })
                }
            }

            let totalRowExtras = 0
            for (let c = 9; c <= 12; c++) {
                if (jobExtras[c] > 0) {
                    row.getCell(c).value = jobExtras[c]
                    summaryTotals[c] += jobExtras[c]
                    totalRowExtras += jobExtras[c]
                }
            }

            row.getCell(13).value = basePrice + totalRowExtras
            summaryTotals[13] += (basePrice + totalRowExtras)

            // Styling for data rows
            row.eachCell((cell) => {
                cell.font = { name: 'Sarabun', size: 10 }
                if (cell.col >= 8) cell.numFmt = '#,##0.00'
            })
        })

        // 6. Summary Row
        const footerRow = worksheet.getRow(27)
        for (let c = 8; c <= 13; c++) {
            footerRow.getCell(c).value = summaryTotals[c]
            footerRow.getCell(c).font = { name: 'Sarabun', bold: true, size: 10 }
            footerRow.getCell(c).numFmt = '#,##0.00'
        }

        // 7. Static Headers
        worksheet.getCell('C3').value = accountingProfile.company_name_th
        worksheet.getCell('C5').value = accountingProfile.address
        worksheet.getCell('A6').value = `เลขที่ประจำตัวผู้เสียภาษี : ${accountingProfile.tax_id}`
        worksheet.getCell('H3').value = `วันที่ ${new Date(finalDoc.Issue_Date || finalDoc.Billing_Date).toLocaleDateString('th-TH')}`
        worksheet.getCell('K3').value = `เลขที่ ${finalDoc.Invoice_ID || finalDoc.Billing_Note_ID}`
        worksheet.getCell('I4').value = finalDoc.Master_Customers?.Customer_Name || finalDoc.Customer_Name || '-'
        worksheet.getCell('I5').value = finalDoc.Master_Customers?.Address || finalDoc.Customer_Address || '-'
        worksheet.getCell('H6').value = `เลขที่ประจำตัวผู้เสียภาษี :  ${finalDoc.Master_Customers?.Tax_ID || finalDoc.Customer_Tax_ID || '-'}`

        // 3. Visuals: Final Font Polish & Auto-fit logic
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                if (!cell.font || cell.font.name !== 'Sarabun') {
                    const isBold = cell.font?.bold || false
                    const fontSize = cell.font?.size || 10
                    cell.font = { name: 'Sarabun', size: fontSize, bold: isBold }
                }
            })
        })

        // Simple Auto-fit Columns
        worksheet.columns.forEach(column => {
            let maxColumnLength = 0
            if (column.eachCell) {
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10
                    if (columnLength > maxColumnLength) maxColumnLength = columnLength
                })
                column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 2
            }
        })

        const buffer = await workbook.xlsx.writeBuffer()
        return { success: true, data: Buffer.from(buffer).toString('base64'), fileName: `Invoice_${invoiceId}.xlsx` }

    } catch (error: any) {
        console.error("Excel Export Error:", error)
        return { success: false, error: error.message }
    }
}
