import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
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
                        .filter((c: { charge_cust?: number }) => c.charge_cust && c.charge_cust > 0)
                        .reduce((acc: number, c: { charge_cust?: number }) => acc + (Number(c.charge_cust) || 0), 0)
                }
            }
        } catch {}
        return sum + base + extra
    }, 0)

    const vat = subtotal * 0.07 
    const total = subtotal + vat

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 print-container">
            <AutoPrint />
            {/* ... (Actions Bar skipped in replacement mostly) */}
            
            {/* A4 Page Container */}
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-4 print:w-full print:max-w-none print:p-0">
                
                {/* Header with Logo */}
                <div className="flex justify-between items-center mb-4 border-b-2 border-slate-800 pb-2">
                    <div className="flex items-center gap-4">
                        {company?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={company.logo_url} 
                                alt="Company Logo" 
                                className="h-14 w-auto object-contain print:block" 
                                style={{ display: 'block' }}
                            />
                        ) : company?.company_name ? (
                             <div className="h-14 w-14 bg-slate-100 flex items-center justify-center rounded text-base font-bold text-slate-400">NO LOGO</div>
                        ) : null}
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">ใบวางบิล</h1>
                            <p className="text-base font-bold text-slate-500 font-bold tracking-[0.2em]">BILLING NOTE</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-900 text-white px-3 py-0.5 rounded text-lg font-bold inline-block">
                            # {note.Billing_Note_ID}
                        </div>
                        <div className="text-base font-bold font-bold text-slate-600 mt-0.5">วันที่: {new Date(note.Billing_Date).toLocaleDateString('th-TH')}</div>
                    </div>
                </div>

                {/* Addresses - Compact */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <h3 className="text-base font-bold font-black text-slate-400 uppercase tracking-widest mb-1.5">ผู้วางบิล (Bill From)</h3>
                        {company ? (
                            <div className="text-base font-bold text-slate-700 leading-tight">
                                <p className="font-bold text-slate-900">{company.company_name}</p>
                                <p className="text-base font-bold text-slate-500 line-clamp-2">{company.address}</p>
                                <div className="pt-1 flex gap-2">
                                    <span className="text-base font-bold font-bold"><span className="text-slate-400">TAX:</span> {company.tax_id}</span>
                                    {company.phone && <span className="text-base font-bold font-bold"><span className="text-slate-400">TEL:</span> {company.phone}</span>}
                                </div>
                            </div>
                        ) : (
                            <p className="text-base font-bold text-red-500">(กรุณาตั้งค่าข้อมูลบริษัท)</p>
                        )}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <h3 className="text-base font-bold font-black text-slate-400 uppercase tracking-widest mb-1.5">ลูกค้า (Bill To)</h3>
                        <div className="text-base font-bold text-slate-700 leading-tight">
                            <p className="font-bold text-slate-900">{note.Customer_Name}</p>
                            {note.Customer_Address ? (
                                <>
                                    <p className="text-base font-bold text-slate-500 line-clamp-1">{note.Customer_Address}</p>
                                    <div className="pt-1 font-bold text-base font-bold">
                                        <span className="text-slate-400">TAX ID:</span> {note.Customer_Tax_ID || '-'}
                                    </div>
                                </>
                            ) : (
                                <span className="text-red-400 text-base font-bold italic">ไม่พบที่อยู่ลูกค้า</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table - Very Compact */}
                <table className="w-full mb-4 border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white text-base font-bold uppercase font-black tracking-widest">
                            <th className="py-1.5 px-3 text-left rounded-l">No.</th>
                            <th className="py-1.5 px-3 text-center">Date</th>
                            <th className="py-1.5 px-3 text-left">Description</th>
                            <th className="py-1.5 px-3 text-right rounded-r">Amount</th>
                        </tr>
                    </thead>
                    {jobs.map((job, index) => {
                            let extraCosts: { type?: string; charge_cust?: number }[] = []
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

                            const chargeableExtras = extraCosts.filter(c => (c.charge_cust ?? 0) > 0)

                            return (
                                <tbody key={job.Job_ID} className="text-base font-bold text-slate-700">
                                    <tr className="border-b border-slate-50">
                                        <td className="py-1.5 px-3 align-top font-bold text-slate-400">{index + 1}</td>
                                        <td className="py-1.5 px-3 text-center align-top whitespace-nowrap">
                                            {new Date(job.Plan_Date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-900">ค่าขนส่ง (Job: {job.Job_ID})</div>
                                            <div className="text-slate-500 text-base font-bold">{job.Route_Name}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-right align-top font-black">{job.Price_Cust_Total?.toLocaleString()}</td>
                                    </tr>
                                    {chargeableExtras.map((extra, i) => (
                                        <tr key={`${job.Job_ID}-extra-${i}`} className="text-slate-500 bg-slate-50/20 border-b border-slate-50/50">
                                            <td className="py-1 px-3" colSpan={2}></td>
                                            <td className="py-1 px-3 text-base font-bold">↳ {extra.type}</td>
                                            <td className="py-1 px-3 text-right text-base font-bold font-bold">{Number(extra.charge_cust).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )
                        })}
                </table>

                {/* Totals and Remarks - Side by Side */}
                <div className="flex justify-between items-start gap-8 mb-4 break-inside-avoid">
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-xs">
                        <h4 className="text-base font-bold font-black text-slate-400 uppercase tracking-widest mb-1">หมายเหตุ (Remarks)</h4>
                        <div className="text-base font-bold text-slate-500 leading-tight space-y-0.5">
                            <p>• ชำระเงินโดยการโอนเข้าบัญชีบริษัท</p>
                            <p className="font-bold text-slate-700 mt-1">ธนาคารกสิกรไทย: 123-4-56789-0</p>
                            <p className="text-base font-bold">ชื่อ: บจก. ดีดี ออร์แกนไนซ์ แอนด์ ทรานสปอร์ต</p>
                        </div>
                    </div>

                    <div className="w-56 space-y-1">
                        <div className="flex justify-between text-base font-bold font-bold text-slate-500">
                            <span>SUBTOTAL</span>
                            <span className="text-slate-900">{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold font-bold text-slate-500">
                            <span>VAT 7%</span>
                            <span className="text-slate-900">{vat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-end font-black text-xl text-slate-900 border-t-2 border-slate-900 pt-2 mt-1">
                            <span className="text-base font-bold text-slate-400">TOTAL</span>
                            <div className="border-b-2 border-double border-slate-900">
                                <span className="text-lg font-bold font-bold mr-1 text-slate-400">฿</span>
                                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signatures Area - Compact */}
                <div className="grid grid-cols-2 gap-8 mt-6 page-break-avoid">
                    <div className="text-center">
                        <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                        <p className="text-base font-bold font-black text-slate-300 uppercase tracking-widest">Authorized Signature</p>
                        <p className="text-base font-bold text-slate-800 font-bold">ผู้วางบิล</p>
                    </div>
                    <div className="text-center">
                        <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                        <p className="text-base font-bold font-black text-slate-300 uppercase tracking-widest">Receiver Signature</p>
                        <p className="text-base font-bold text-slate-800 font-bold">ผู้รับวางบิล</p>
                    </div>
                </div>
            </div>

            <style type="text/css" media="print">{`
                @page { 
                    size: A4; 
                    margin: 5mm 10mm; 
                }
                body { 
                    visibility: hidden; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                #printable-content, #printable-content * { 
                    visibility: visible; 
                }
                #printable-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white !important;
                }
                .page-break-avoid {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                img {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: 20mm !important; 
                    width: auto !important;
                    max-width: 60mm !important;
                    object-fit: contain !important;
                }
            `}</style>
        </div>
    )
}
