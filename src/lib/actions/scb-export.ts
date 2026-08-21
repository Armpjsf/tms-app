"use server"

/**
 * สร้างไฟล์ Excel "paste-ready" สำหรับนำไปวางในเทมเพลต SCB Business Anywhere
 * (Import File — โอนผ่านเลขที่บัญชี). ระบบ SCB ต้องใช้เทมเพลตมาโครของธนาคารเอง
 * (ปุ่ม Generate Text File + dropdown ธนาคาร) ซึ่งต้องเป็นบัญชีธุรกิจถึงจะโหลดได้
 * — ไฟล์นี้จึงเตรียม "แถวรายการ" (คอลัมน์ 9–17) ให้ copy ไปวางในเทมเพลตจริง
 *
 * กติกา SCB: ค่าที่ขึ้นต้นด้วย 0 (รหัสธนาคาร/เลขบัญชี) ต้องเก็บเป็น "ข้อความ"
 * เพื่อคงเลข 0 นำหน้า → กำหนด numFmt '@' + ใส่ค่าเป็น string
 */

import ExcelJS from "exceljs"
import { getDriverPaymentByIdWithJobs } from "@/lib/supabase/billing"
import { BANKS, getBankCode } from "@/lib/constants/banks"

function bankLabel(bankValue?: string | null): string {
    if (!bankValue) return ""
    const b = BANKS.find(x => x.value === bankValue || x.label.includes(bankValue) || x.code === bankValue)
    return b ? b.label : bankValue
}

export async function generateScbPaymentXlsx(paymentId: string): Promise<
    { success: true; filename: string; base64: string } | { success: false; message: string }
> {
    try {
        const data = await getDriverPaymentByIdWithJobs(paymentId)
        if (!data) return { success: false, message: "ไม่พบข้อมูลใบสำคัญจ่าย" }

        const { payment, jobs, bankInfo } = data
        const acctNo = String(bankInfo.Bank_Account_No || "").replace(/\D/g, "")
        if (!acctNo) return { success: false, message: "คนขับ/รถร่วมรายนี้ไม่มีเลขบัญชีธนาคาร" }

        // ยอดโอนสุทธิ: ใช้ Net_Amount ที่แอดมินตั้งตอนทำจ่าย ถ้าไม่มี fallback หัก 1%
        const p = payment as unknown as { Net_Amount?: number }
        const subtotal = jobs.reduce((s: number, j: { Cost_Driver_Total?: number | null }) => s + (Number(j.Cost_Driver_Total) || 0), 0)
        const netAmount = p.Net_Amount != null ? Number(p.Net_Amount) : subtotal - Math.round(subtotal * 0.01)

        const bankCode = getBankCode(bankInfo.Bank_Name || "")            // 3 หลัก เช่น 014
        const bankName = bankLabel(bankInfo.Bank_Name)                    // ชื่อไทยสำหรับ dropdown
        const recipientName = bankInfo.Bank_Account_Name || payment.Driver_Name

        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet("SCB_Transfer")

        // หัวคอลัมน์ (ตามเทมเพลต Import File คอลัมน์ 8–17)
        ws.columns = [
            { header: "ลำดับ", key: "seq", width: 8 },
            { header: "รหัสธนาคาร", key: "bankCode", width: 12 },
            { header: "ชื่อธนาคาร (สำหรับ dropdown)", key: "bankName", width: 30 },
            { header: "เลขที่บัญชี/พร้อมเพย์", key: "acct", width: 22 },
            { header: "ชื่อผู้รับเงิน (TH/EN)", key: "name", width: 30 },
            { header: "จำนวนเงิน", key: "amount", width: 14 },
            { header: "อ้างอิงรายการ", key: "ref", width: 20 },
            { header: "หักค่าธรรมเนียมจาก", key: "fee", width: 18 },
            { header: "โทรศัพท์ผู้รับ (SMS)", key: "phone", width: 16 },
            { header: "อีเมลผู้รับ", key: "email", width: 22 },
            { header: "หมายเหตุ (<200)", key: "remark", width: 28 },
        ]
        ws.getRow(1).font = { bold: true }

        // คอลัมน์เก็บเป็นข้อความเพื่อคงเลข 0 นำหน้า
        ws.getColumn("bankCode").numFmt = "@"
        ws.getColumn("acct").numFmt = "@"

        ws.addRow({
            seq: 1,
            bankCode: bankCode,        // string, numFmt '@' คง 014
            bankName: bankName,
            acct: acctNo,              // string
            name: recipientName,
            amount: Number(netAmount.toFixed(2)),
            ref: payment.Driver_Payment_ID,
            fee: "Payer (OUR)",
            phone: "",
            email: "",
            remark: `ค่าเที่ยววิ่ง ${payment.Driver_Payment_ID}`,
        })
        ws.getColumn("amount").numFmt = "#,##0.00"

        const buf = await wb.xlsx.writeBuffer()
        const base64 = Buffer.from(buf).toString("base64")
        return { success: true, filename: `SCB_${payment.Driver_Payment_ID}.xlsx`, base64 }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "สร้างไฟล์ไม่สำเร็จ" }
    }
}
