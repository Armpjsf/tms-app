"use client"

import React from "react"
import type { VoucherData } from "@/lib/payslip/voucher"

const baht = (n: number) => `฿${(Math.round(n * 100) / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (s: string | null) => {
  if (!s) return "-"
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("th-TH")
}

/** ใบสำคัญจ่าย (render จาก snapshot) — ใช้แสดงในแอปคนขับ + เป็นแหล่ง render PDF */
export const PayslipVoucherView = React.forwardRef<HTMLDivElement, { data: VoucherData }>(
  function PayslipVoucherView({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{
          background: "#ffffff",
          color: "#0f172a",
          padding: 20,
          fontFamily: "'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 12,
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, borderBottom: "2px solid #1e293b", paddingBottom: 12 }}>
          <div style={{ maxWidth: "62%" }}>
            {data.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.company.logoUrl} alt="logo" style={{ height: 40, objectFit: "contain", marginBottom: 6 }} crossOrigin="anonymous" />
            ) : null}
            <div style={{ fontWeight: 800, fontSize: 14 }}>{data.company.name || ""}</div>
            {data.company.nameEn && <div style={{ color: "#64748b" }}>{data.company.nameEn}</div>}
            {data.company.address && <div style={{ color: "#64748b", lineHeight: 1.4 }}>{data.company.address}</div>}
            {data.company.taxId && <div style={{ color: "#64748b" }}>เลขผู้เสียภาษี: {data.company.taxId}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>ใบสำคัญจ่าย</div>
            <div style={{ color: "#64748b", letterSpacing: 2, fontSize: 10 }}>PAYMENT VOUCHER</div>
            <div style={{ marginTop: 6, fontFamily: "monospace", fontWeight: 700 }}>{data.docId}</div>
            <div style={{ color: "#64748b", marginTop: 2 }}>วันที่ {fmtDate(data.date)}</div>
          </div>
        </div>

        {/* Payee */}
        <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>จ่ายให้ (คนขับ/คู่ค้า)</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{data.driverName}</div>
            {data.bank.accNo && (
              <div style={{ color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                {data.bank.name} · {data.bank.accNo}
                {data.bank.accName ? <><br />{data.bank.accName}</> : null}
              </div>
            )}
          </div>
        </div>

        {/* Lines */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#1e293b", color: "#fff" }}>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>วันที่</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>เลขที่งาน</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>ลูกค้า/เส้นทาง</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={l.jobId + i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                <td style={{ padding: "5px 8px", fontFamily: "monospace" }}>{l.jobId}</td>
                <td style={{ padding: "5px 8px" }}>{l.customer || l.route || "-"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{baht(l.amount)}</td>
              </tr>
            ))}
            {data.lines.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 10, textAlign: "center", color: "#94a3b8" }}>ไม่มีรายการงาน</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <div style={{ width: 260 }}>
            <Row label="รวมค่าเที่ยว" value={baht(data.subtotal)} />
            {data.vatAmount > 0 && <Row label={`ภาษีมูลค่าเพิ่ม (${data.vatRate}%)`} value={baht(data.vatAmount)} />}
            {data.withholding > 0 && <Row label={`หัก ณ ที่จ่าย (${data.whtRate}%)`} value={"-" + baht(data.withholding)} />}
            {data.claimAmount > 0 && <Row label={`หักค่าเคลม (${data.claimRate}%)`} value={"-" + baht(data.claimAmount)} />}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px", marginTop: 4, borderTop: "2px solid #1e293b", fontWeight: 800, fontSize: 14 }}>
              <span>ยอดโอนสุทธิ</span>
              <span style={{ color: "#047857" }}>{baht(data.netTotal)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, color: "#94a3b8", fontSize: 10, textAlign: "center" }}>
          เอกสารนี้ออกจากระบบ TMS — {data.docId}
        </div>
      </div>
    )
  }
)

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 4px", color: "#475569" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
