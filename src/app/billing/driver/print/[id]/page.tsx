
import { getDriverPaymentByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { AutoPrint } from "@/components/utils/auto-print"

export const dynamic = 'force-dynamic'

type Props = {
    params: Promise<{ id: string }>
}

export default async function DriverPaymentPrintPage(props: Props) {
    const params = await props.params;
    const { id } = params
    const data = await getDriverPaymentByIdWithJobs(id)

    if (!data) {
        return notFound()
    }

    const { payment, jobs, company, bankInfo } = data
    const WITHHOLDING_TAX_RATE = 0.01

    // Calculate totals to ensure consistency
    const subtotal = jobs.reduce((sum, job) => sum + (job.Cost_Driver_Total || 0), 0)
    const withholding = Math.round(subtotal * WITHHOLDING_TAX_RATE)
    const netTotal = subtotal - withholding

    const totalAmount = subtotal // or netTotal depending on preference, subtotal is gross
    
    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0">
            <AutoPrint />
            
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-8 print:w-full print:max-w-none print:px-12 print:py-6 relative">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                    {/* Left: Logo & Company Info */}
                    <div className="flex flex-col gap-4 max-w-[60%]">
                        {company?.logo_url && (
                            <div>
                                <img 
                                    src={company.logo_url} 
                                    alt="Company Logo" 
                                    className="h-24 w-auto object-contain" 
                                />
                            </div>
                        )}
                        <div className="text-sm">
                            {company ? (
                                <>
                                    <h2 className="font-bold text-lg">{company.company_name}</h2>
                                    {company.company_name_en && (
                                        <p className="text-slate-600 font-medium">{company.company_name_en}</p>
                                    )}
                                    <p className="mt-2 text-slate-700">{company.address}</p>
                                    <div className="flex gap-4 mt-1">
                                        <p><span className="font-semibold">Tax ID:</span> {company.tax_id}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-slate-400">Loading company info...</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Document Title */}
                    <div className="text-right">
                        <h1 className="text-4xl font-bold text-slate-900 tracking-wide">ใบสำคัญจ่าย</h1>
                        <p className="text-slate-500 text-lg font-medium tracking-widest uppercase mt-1">Payment Voucher</p>
                        <div className="mt-4">
                             <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">
                                ORIGINAL (ต้นฉบับ)
                             </span>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-300 mb-6" />

                {/* Info Grid: Payer & Payee */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Payer Info (Company) */}
                    <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
                         <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">ผู้ทำจ่าย (Payer)</h3>
                         {company ? (
                            <div className="text-sm text-slate-600 mt-2 space-y-1">
                                <p className="font-semibold text-lg text-slate-900">{company.company_name}</p>
                                <p>{company.address}</p>
                                <p><span className="font-semibold">Tax ID:</span> {company.tax_id}</p>
                            </div>
                         ) : (
                            <p className="text-sm text-slate-400">Loading...</p>
                         )}
                    </div>

                    {/* Payee Info (Driver) */}
                    <div className="border border-slate-200 rounded p-4">
                        <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">ผู้รับเงิน (Payee)</h3>
                        <p className="font-semibold text-lg text-slate-900">{payment.Driver_Name}</p>
                        <div className="text-sm text-slate-600 mt-2 space-y-1">
                            {bankInfo.Bank_Account_No ? (
                                <>
                                    <p><span className="font-semibold">Bank:</span> {bankInfo.Bank_Name}</p>
                                    <p><span className="font-semibold">Account No:</span> {bankInfo.Bank_Account_No} <span className="text-xs text-slate-400">({bankInfo.Bank_Account_Name})</span></p>
                                </>
                            ) : (
                                <p className="text-amber-600 italic">* ไม่พบข้อมูลบัญชีธนาคาร</p>
                            )}
                         </div>
                    </div>
                </div>

                {/* Document Details Row */}
                <div className="flex justify-between items-center mb-6 text-sm bg-slate-50 p-3 rounded border border-slate-200">
                     <div>
                        <span className="text-slate-500 mr-2">เลขที่เอกสาร (No.):</span>
                        <span className="font-mono font-bold">{payment.Driver_Payment_ID}</span>
                     </div>
                     <div>
                        <span className="text-slate-500 mr-2">วันที่ (Date):</span>
                        <span className="font-medium">{new Date(payment.Payment_Date).toLocaleDateString('th-TH')}</span>
                     </div>
                     <div>
                        <span className="text-slate-500 mr-2">วิธีการชำระ (Payment Method):</span>
                        <span className="font-medium">Bank Transfer</span>
                     </div>
                </div>

                {/* Table */}
                <div className="mb-8">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 border-y-2 border-slate-300">
                                <th className="py-3 px-4 text-center font-bold w-16">ลำดับ<br/><span className="text-xs font-normal">No.</span></th>
                                <th className="py-3 px-4 text-left font-bold">รายละเอียด<br/><span className="text-xs font-normal">Description</span></th>
                                <th className="py-3 px-4 text-left font-bold">วันที่<br/><span className="text-xs font-normal">Date</span></th>
                                <th className="py-3 px-4 text-left font-bold">เส้นทาง<br/><span className="text-xs font-normal">Route</span></th>
                                <th className="py-3 px-4 text-right font-bold w-32">จำนวนเงิน<br/><span className="text-xs font-normal">Amount</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((item, index) => (
                                <tr key={item.Job_ID} className="border-b border-slate-200">
                                    <td className="py-3 px-4 text-center text-slate-500">{index + 1}</td>
                                    <td className="py-3 px-4 font-medium text-slate-800">
                                        ค่าเที่ยววิ่ง (Job: {item.Job_ID})
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">
                                        {item.Plan_Date ? new Date(item.Plan_Date).toLocaleDateString('th-TH') : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 text-xs">
                                        {item.Route_Name || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                                        {item.Cost_Driver_Total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {Array.from({ length: Math.max(0, 5 - jobs.length) }).map((_, i) => (
                                 <tr key={`empty-${i}`} className="border-b border-slate-100 h-10">
                                    <td colSpan={5}></td>
                                 </tr>
                            ))}
                        </tbody>
                        <tfoot>
                             <tr>
                                <td colSpan={3} rowSpan={3} className="pt-4 pr-8 align-top">
                                    <div className="border border-slate-300 bg-slate-50 p-3 rounded text-xs text-slate-500">
                                        <p className="font-bold mb-1">หมายเหตุ (Remarks):</p>
                                        <p>- ยอดเงินนี้รวมค่าแรงและค่าพาหนะแล้ว</p>
                                        <p>- Auto-generated Payment Voucher</p>
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-right font-bold text-slate-600">รวมเป็นเงิน</td>
                                <td className="py-2 px-4 text-right font-bold text-slate-800">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 text-right text-slate-600 text-sm">หัก ณ ที่จ่าย 1%</td>
                                <td className="py-2 px-4 text-right text-red-500 font-medium">-{withholding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-slate-50 border-t-2 border-slate-300 border-b-2">
                                <td className="py-3 px-4 text-right font-bold text-slate-900 text-lg">ยอดสุทธิ</td>
                                <td className="py-3 px-4 text-right font-bold text-indigo-700 text-lg decoration-double underline">
                                    {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                 {/* Footer Signatures */}
                <div className="flex justify-between mt-16 text-sm text-slate-600 pb-8 break-inside-avoid">
                     <div className="text-center w-1/3">
                        <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                        <p className="font-bold">ผู้รับเงิน</p>
                        <p className="text-xs">(Payee)</p>
                        <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="border-b border-slate-400 mb-2 h-8 w-3/4 mx-auto"></div>
                        <p className="font-bold">ผู้จ่ายเงิน / ผู้มีอำนาจลงนาม</p>
                        <p className="text-xs">(Payer / Authorized Signature)</p>
                        <div className="mt-4 text-xs">วันที่ (Date): _____/_____/_______</div>
                    </div>
                </div>
            </div>

            <style type="text/css" media="print">{`
                @page { size: auto;  margin: 0mm; }
                body { visibility: hidden; background: white !important; }
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
