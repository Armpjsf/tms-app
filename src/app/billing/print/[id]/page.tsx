import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { BillingActions } from "@/components/billing/billing-actions"

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

    // Calculate totals
    const subtotal = note.Total_Amount
    const vat = subtotal * 0.07 // 7% VAT (Assuming exclude VAT for now or adjust based on business logic)
    const total = subtotal + vat

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0">
            {/* Actions Bar (Hidden when printing) */}
            <div className="max-w-4xl mx-auto mb-8 print:hidden flex flex-col gap-4">
                 <BillingActions 
                    billingNoteId={id} 
                    customerEmail={note.Customer_Email || ""} // Assuming we fetched email or need to join customer
                    customerName={note.Customer_Name}
                 />
            </div>

            {/* A4 Page Container */}
            <div className="max-w-[210mm] mx-auto bg-white print:w-full print:max-w-none">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b pb-6">
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
                <div className="grid grid-cols-2 gap-8 mb-8">
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
                            (ที่อยู่ลูกค้า)<br/>
                            (เลขประจำตัวผู้เสียภาษี)
                        </p>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-sm">
                            <th className="py-3 px-4 text-left">ลำดับ</th>
                            <th className="py-3 px-4 text-left">รายละเอียด (Job ID / Route)</th>
                            <th className="py-3 px-4 text-center">วันที่ขนส่ง</th>
                            <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                        {jobs.map((job, index) => (
                            <tr key={job.Job_ID} className="border-b border-slate-200">
                                <td className="py-3 px-4">{index + 1}</td>
                                <td className="py-3 px-4">
                                    <div className="font-bold">{job.Job_ID}</div>
                                    <div className="text-slate-500 text-xs">{job.Route_Name}</div>
                                    <div className="text-slate-500 text-xs">{job.Origin_Location} - {job.Dest_Location}</div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    {new Date(job.Plan_Date).toLocaleDateString('th-TH')}
                                </td>
                                <td className="py-3 px-4 text-right">{job.Price_Cust_Total?.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-12">
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
                <div className="grid grid-cols-2 gap-12 mt-20">
                    <div className="border-t border-slate-300 pt-4 text-center">
                        <div className="h-12"></div>
                        <p className="text-sm text-slate-600">ลงชื่อ ผู้วางบิล</p>
                         <p className="text-sm font-bold text-slate-800 mt-1">{company?.company_name}</p>
                        <p className="text-xs text-slate-400 mt-1">วันที่ .......................................</p>
                    </div>
                    <div className="border-t border-slate-300 pt-4 text-center">
                        <div className="h-12"></div>
                        <p className="text-sm text-slate-600">ลงชื่อ ผู้รับวางบิล</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">{note.Customer_Name}</p>
                        <p className="text-xs text-slate-400 mt-1">วันที่ .......................................</p>
                    </div>
                </div>
                
            </div>

            <style type="text/css" media="print">{`
                @page { size: auto;  margin: 0mm; }
                body { background-color: white; }
            `}</style>
        </div>
    )
}
