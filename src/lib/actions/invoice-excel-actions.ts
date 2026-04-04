'use server'

import { createAdminClient } from '@/utils/supabase/server'
import ExcelJS from 'exceljs'
import { getSystemSetting } from './system-settings-actions'
import fs from 'fs'
import path from 'path'

export async function exportInvoiceExcel(invoiceId: string) {
    try {
        const supabase = createAdminClient()

        // 1. Get Document Info
        const { data: invoice } = await supabase.from('invoices').select('*, Master_Customers(*)').eq('Invoice_ID', invoiceId).maybeSingle()
        const { data: bn } = !invoice ? await supabase.from('Billing_Notes').select('*').eq('Billing_Note_ID', invoiceId).maybeSingle() : { data: null }
        const finalDoc = invoice || bn
        if (!finalDoc) throw new Error("ไม่พบข้อมูลเอกสาร")

        // 2. Get Jobs and Customer Unit Price
        const { data: jobs } = await supabase.from('Jobs_Main').select('*').or(`Invoice_ID.eq."${invoiceId}",Billing_Note_ID.eq."${invoiceId}"`)
        if (!jobs || jobs.length === 0) throw new Error("ไม่พบรายการงาน")

        const customerId = finalDoc.Customer_ID || jobs[0].Customer_ID
        const { data: customer } = await supabase.from('Master_Customers').select('Price_Per_Unit').eq('Customer_ID', customerId).maybeSingle()
        const customerUnitPrice = customer?.Price_Per_Unit || 0

        const accountingProfile = await getSystemSetting('accounting_profile', {
            company_name_th: "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด",
            address: "เลขที่ 99/2 หมู่ที่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000",
            tax_id: "0745559001353 (สำนักงานใหญ่)"
        })

        // 3. Load Template
        const templatePath = path.join(process.cwd(), 'src', 'lib', 'templates', 'invoice_template.xlsx')
        if (!fs.existsSync(templatePath)) throw new Error("Template file not found")
        
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(templatePath)
        const worksheet = workbook.getWorksheet(1)
        if (!worksheet) throw new Error("Worksheet not found")

        // 4. Robust Range Clear
        for (let r = 7; r <= 27; r++) {
            const row = worksheet.getRow(r)
            for (let c = 1; c <= 13; c++) {
                if (r === 7 && (c < 8 || c > 12)) continue // Keep static headers like No, Date, etc.
                if (r > 7 && r < 10) row.getCell(c).value = null // Clear spacer rows
                if (r >= 10) row.getCell(c).value = null
            }
            row.commit()
        }

        // 5. Identify ALL Unique Extra Cost Types across all jobs
        const extraTypesSet = new Set<string>()
        
        // Check standard columns first
        if (jobs.some(j => (Number(j.Price_Cust_Extra) || 0) > 0)) extraTypesSet.add('เพิ่มจุดลงของ')
        if (jobs.some(j => (Number(j.Charge_Labor) || 0) > 0)) extraTypesSet.add('แรงงานยกของ')
        if (jobs.some(j => (Number(j.Charge_Wait) || 0) > 0)) extraTypesSet.add('รอลงเกินเวลา')
        if (jobs.some(j => (Number(j.Price_Cust_Other) || 0) > 0)) extraTypesSet.add('อื่นๆ')

        // Check JSON data
        jobs.forEach(job => {
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch {} }
                if (Array.isArray(costs)) {
                    costs.forEach((c: any) => {
                        if (c.type && (Number(c.charge_cust) || 0) > 0) {
                            extraTypesSet.add(c.type)
                        }
                    })
                }
            }
        })

        const allExtraTypes = Array.from(extraTypesSet)
        // We have 4 slots: Column I (9), J (10), K (11), L (12)
        const columnMap: Record<string, number> = {}
        const headerRow = worksheet.getRow(7)
        
        for (let i = 0; i < 4; i++) {
            const colIndex = 9 + i // Starts at I
            const typeName = allExtraTypes[i]
            if (typeName) {
                headerRow.getCell(colIndex).value = typeName
                columnMap[typeName] = colIndex
            } else {
                headerRow.getCell(colIndex).value = '-'
            }
        }
        headerRow.commit()

        // 6. Fill Data
        const summaryTotals: any = { 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 }

        jobs.forEach((job, index) => {
            const r = 10 + index
            if (r > 26) return
            const row = worksheet.getRow(r)

            // Column A-G
            row.getCell(1).value = index + 1
            row.getCell(2).value = job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'
            row.getCell(3).value = job.Vehicle_Type || '-'
            row.getCell(4).value = Number(job.Total_Drop || 1)
            row.getCell(5).value = job.Origin_Location || '-'
            row.getCell(6).value = job.Dest_Location || job.Route_Name || '-'
            row.getCell(7).value = Number(((Number(job.Est_Distance_KM) || 0) * 0.12).toFixed(2))

            // Column H: Base Wage (Freight)
            let basePrice = Number(job.Price_Cust_Total || 0)
            if (basePrice === 0) {
                const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 0)
                const unitPrice = Number(job.Price_Per_Unit || customerUnitPrice)
                if (unitPrice > 0 && qty > 0) basePrice = Number((qty * unitPrice).toFixed(2))
            }
            row.getCell(8).value = basePrice
            summaryTotals[8] += basePrice

            // Columns I-L: Dynamic Extras
            const jobExtras: Record<number, number> = { 9: 0, 10: 0, 11: 0, 12: 0 }
            
            // Map standard columns to types if they exist in columnMap
            if (Number(job.Price_Cust_Extra) > 0 && columnMap['เพิ่มจุดลงของ']) jobExtras[columnMap['เพิ่มจุดลงของ']] += Number(job.Price_Cust_Extra)
            if (Number(job.Charge_Labor) > 0 && columnMap['แรงงานยกของ']) jobExtras[columnMap['แรงงานยกของ']] += Number(job.Charge_Labor)
            if (Number(job.Charge_Wait) > 0 && columnMap['รอลงเกินเวลา']) jobExtras[columnMap['รอลงเกินเวลา']] += Number(job.Charge_Wait)
            if (Number(job.Price_Cust_Other) > 0 && columnMap['อื่นๆ']) jobExtras[columnMap['อื่นๆ']] += Number(job.Price_Cust_Other)

            // Map JSON extras
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch {} }
                if (Array.isArray(costs)) {
                    costs.forEach((c: any) => {
                        const val = Number(c.charge_cust) || 0
                        if (val > 0 && columnMap[c.type]) {
                            jobExtras[columnMap[c.type]] += val
                        } else if (val > 0) {
                            // If more than 4 types, lump into the last available column (L) if it's 'อื่นๆ' or just the 4th column
                            jobExtras[12] += val
                        }
                    })
                }
            }

            // Write extras to cells
            let totalExtras = 0
            for (let c = 9; c <= 12; c++) {
                const val = jobExtras[c]
                if (val > 0) {
                    row.getCell(c).value = val
                    summaryTotals[c] += val
                    totalExtras += val
                }
            }

            // Column M: Row Total
            const rowTotal = basePrice + totalExtras
            row.getCell(13).value = rowTotal
            summaryTotals[13] += rowTotal

            // Formatting
            for (let c = 8; c <= 13; c++) {
                row.getCell(c).numFmt = '#,##0.00'
            }
            row.commit()
        })

        // 7. Final Summary Row (Row 27)
        const footerRow = worksheet.getRow(27)
        for (let c = 8; c <= 13; c++) {
            footerRow.getCell(c).value = summaryTotals[c]
            footerRow.getCell(c).numFmt = '#,##0.00'
        }
        footerRow.commit()

        // 8. Fill Static Headers (C3, C5, A6, H3, K3, I4, I5, H6)
        worksheet.getCell('C3').value = accountingProfile.company_name_th
        worksheet.getCell('C5').value = accountingProfile.address
        worksheet.getCell('A6').value = `เลขที่ประจำตัวผู้เสียภาษี : ${accountingProfile.tax_id}`
        const dateStr = new Date(finalDoc.Issue_Date || finalDoc.Billing_Date).toLocaleDateString('th-TH')
        worksheet.getCell('H3').value = `วันที่ ${dateStr}`
        worksheet.getCell('K3').value = `เลขที่ ${finalDoc.Invoice_ID || finalDoc.Billing_Note_ID}`
        worksheet.getCell('I4').value = finalDoc.Master_Customers?.Customer_Name || finalDoc.Customer_Name || '-'
        worksheet.getCell('I5').value = finalDoc.Master_Customers?.Address || finalDoc.Customer_Address || '-'
        worksheet.getCell('H6').value = `เลขที่ประจำตัวผู้เสียภาษี :  ${finalDoc.Master_Customers?.Tax_ID || finalDoc.Customer_Tax_ID || '-'}`

        // 9. Return as Base64
        const buffer = await workbook.xlsx.writeBuffer()
        return { success: true, data: Buffer.from(buffer).toString('base64'), fileName: `Invoice_${invoiceId}.xlsx` }

    } catch (error: any) {
        console.error("Excel Export Error:", error)
        return { success: false, error: error.message }
    }
}
