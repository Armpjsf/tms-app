import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { BillingActions } from "@/components/billing/billing-actions"
import { AutoPrint } from "@/components/utils/auto-print"

export const dynamic = 'force-dynamic'

type Props = {
    params: Promise<{ id: string }>
}

export default async function BillingPrintPage(props: Props) {
    const params = await props.params;
    const { id } = params
    const data = await getBillingNoteByIdWithJobs(id)

    if (!data) {
        return notFound()
    }

    const { note, jobs, company } = data

    // Calculate totals dynamically to ensure consistency with displayed items
    const subtotal = jobs.reduce((sum, job) => {
        const base = job.Price_Cust_Total || 0
        let extra = 0
        try {
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') {
                    try { costs = JSON.parse(costs) } catch {}
                }
                if (typeof costs === 'string') {
                    try { costs = JSON.parse(costs) } catch {}
                }
                
                if (Array.isArray(costs)) {
                    extra = costs
                        .filter((c: any) => c.charge_cust > 0)
                        .reduce((acc: number, c: any) => acc + (Number(c.charge_cust) || 0), 0)
                }
            }
        } catch (e) {
            console.error("Error calculating extra costs", e)
        }
        return sum + base + extra
    }, 0)

    // const subtotal = note.Total_Amount // Legacy: Don't use stored total as it might be outdated
    const vat = subtotal * 0.07 
    const total = subtotal + vat

    // DEBUG: Check data
    console.log("DEBUG BILLING JOBS:", JSON.stringify(jobs.map(j => ({ id: j.Job_ID, extra: j.extra_costs_json })), null, 2))

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0">
            <AutoPrint />
            {/* ... (Actions Bar skipped in replacement mostly) */}
            
            {/* A4 Page Container */}
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-8 print:w-full print:max-w-none print:px-12 print:py-6">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">ใบวางบิล</h1>
                        <h2 className="text-xl text-slate-500 font-light">BILLING NOTE</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800"># {note.Billing_Note_ID}</div>
                        <div className="text-slate-500">วันที่: {new Date(note.Billing_Date).toLocaleDateString('th-TH')}</div>
                        {note.Due_Date && (
                            <div className="text-slate-500">ครบกำหนด: {new Date(note.Due_Date).toLocaleDateString('th-TH')}</div>
                        )}
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 mb-4">
                    <div>
                        <h3 className="font-bold text-slate-700 mb-2">ผู้วางบิล (Bill From)</h3>
                        {company ? (
                            <div className="text-sm text-slate-600 leading-relaxed">
                                {company.logo_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={company.logo_url} alt="Company Logo" className="h-16 mb-2 object-contain" />
                                )}
                                <strong>{company.company_name}</strong><br/>
                                {company.address}<br/>
                                <span>เลขประจำตัวผู้เสียภาษี: {company.tax_id}</span><br/>
                                {company.phone && <span>โทร: {company.phone}</span>}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600 leading-relaxed text-red-500">
                                (กรุณาตั้งค่าข้อมูลบริษัทในเมนูตั้งค่า)
                            </p>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 mb-2">ลูกค้า (Bill To)</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            <strong>{note.Customer_Name}</strong><br/>
                            {note.Customer_Address ? (
                                <>
                                {note.Customer_Address}<br/>
                                <span>เลขประจำตัวผู้เสียภาษี: {note.Customer_Tax_ID}</span>
                                </>
                            ) : (
                                <span className="text-red-400">ไม่พบที่อยู่ลูกค้า (กรุณาตวจสอบใน Master Data)</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full mb-4">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-sm">
                            <th className="py-2 px-4 text-left">ลำดับ</th>
                            <th className="py-2 px-4 text-center w-32">วันที่ขนส่ง</th>
                            <th className="py-2 px-4 text-left">รายละเอียด (Job ID / Route)</th>
                            <th className="py-2 px-4 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    {jobs.map((job, index) => {
                            let extraCosts: any[] = []
                            try {
                                if (job.extra_costs_json) {
                                    let parsed = job.extra_costs_json
                                    if (typeof parsed === 'string') {
                                        try { parsed = JSON.parse(parsed) } catch {}
                                    }
                                    if (typeof parsed === 'string') {
                                        try { parsed = JSON.parse(parsed) } catch {}
                                    }
                                    if (Array.isArray(parsed)) {
                                        extraCosts = parsed
                                    }
                                }
                            } catch {}

                            const chargeableExtras = extraCosts.filter(c => c.charge_cust > 0)

                            return (
                                <tbody key={job.Job_ID} className="text-sm text-slate-700 border-b border-slate-200">
                                    {/* Main Job Row */}
                                    <tr>
                                        <td className="py-2 px-4 align-top">{index + 1}</td>
                                        <td className="py-2 px-4 text-center align-top">
                                            {new Date(job.Plan_Date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="font-bold">ค่าขนส่ง (Job: {job.Job_ID})</div>
                                            <div className="text-slate-500 text-xs">{job.Route_Name}</div>
                                        </td>
                                        <td className="py-2 px-4 text-right align-top">{job.Price_Cust_Total?.toLocaleString()}</td>
                                    </tr>

                                    {/* Extra Costs Rows */}
                                    {chargeableExtras.map((extra, i) => (
                                        <tr key={`${job.Job_ID}-extra-${i}`} className="text-slate-600">
                                            <td className="py-1 px-4"></td>
                                            <td className="py-1 px-4 text-center">
                                                {/* Same Date or empty */}
                                            </td>
                                            <td className="py-1 px-4">
                                                <div className="text-sm border-l-2 border-slate-300 pl-2">
                                                    {extra.type}
                                                </div>
                                            </td>
                                            <td className="py-1 px-4 text-right">{Number(extra.charge_cust).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )
                        })}
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>รวมเป็นเงิน</span>
                            <span>{subtotal.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>ภาษีมูลค่าเพิ่ม 7%</span>
                            <span>{vat.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-slate-800 border-t pt-2 mt-2">
                            <span>ยอดรวมสุทธิ</span>
                            <span>{total.toLocaleString()} บาท</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-8 break-inside-avoid">
                    <div className="border-t border-slate-300 pt-4 text-center">
                        <p className="text-sm text-slate-600">ลงชื่อ ผู้วางบิล</p>
                        <div className="h-8 mt-2"></div>
                        <p className="text-xs text-slate-400 mt-1">วันที่ .......................................</p>
                    </div>
                    <div className="border-t border-slate-300 pt-4 text-center">
                        <p className="text-sm text-slate-600">ลงชื่อ ผู้รับวางบิล</p>
                        <div className="h-8 mt-2"></div>
                        <p className="text-xs text-slate-400 mt-1">วันที่ .......................................</p>
                    </div>
                </div>
                
            </div>

            <style type="text/css" media="print">{`
                @page { size: auto;  margin: 0mm; }
                body { visibility: hidden; }
                #printable-content, #printable-content * { visibility: visible; }
                #printable-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
            `}</style>
        </div>
    )
}
