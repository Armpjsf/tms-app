import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"

import { PrintAction } from "./print-button"
import { dictionaries, Language } from "@/lib/i18n/dictionaries"
import { Phone, Mail, User, FileText, CreditCard, MessageSquare, PenTool } from "lucide-react"

export const dynamic = 'force-dynamic'

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ lang?: string }>;
}

function ArabicNumberToText(Number: number) {
    const numStr = Number.toFixed(2);
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const fractionalPart = parts[1];

    const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function readNumber(num: string) {
        if (num === '0' || num === '00') return '';
        let result = '';
        let len = num.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(num.charAt(i), 10);
            const pos = (len - i - 1) % 6;
            const isMillion = (len - i - 1) >= 6 && pos === 0;
            
            if (digit !== 0) {
                if (pos === 1 && digit === 1) {
                    result += 'สิบ';
                } else if (pos === 1 && digit === 2) {
                    result += 'ยี่สิบ';
                } else if (pos === 0 && digit === 1 && len > 1 && num.charAt(len-2) !== '0') {
                    result += 'เอ็ด';
                } else {
                    result += numbers[digit] + positions[pos];
                }
            }
            if (isMillion) {
                result += 'ล้าน';
            }
        }
        return result;
    }

    let text = readNumber(integerPart);
    if (text === '') text = 'ศูนย์';
    text += 'บาท';
    if (fractionalPart === '00') {
        text += 'ถ้วน';
    } else {
        text += readNumber(fractionalPart) + 'สตางค์';
    }
    return text;
}

export default async function BillingPrintPage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { id } = params
    const lang = (searchParams?.lang as Language) || 'th'
    
    const data = await getBillingNoteByIdWithJobs(id)

    if (!data) {
        return notFound()
    }

    const note = data.note as any
    const { jobs, company } = data

    // Unified Data Access
    const logoUrl = company?.logo_url || company?.Logo_URL || '/images/account logo.png'
    const sellerName = company?.company_name_th || company?.Company_Name_TH || (lang === 'th' ? company?.company_name : company?.company_name_en)
    const sellerAddress = company?.address || company?.Address
    const sellerTaxId = company?.tax_id || company?.Tax_ID
    const sellerPhone = company?.phone || company?.Phone
    const sellerEmail = company?.email || company?.Email
    
    const bankName = company?.bank_name || company?.Bank_Name || 'ธนาคารไทยพาณิชย์ (SCB)'
    const bankAccNo = company?.bank_account_no || company?.Bank_Account_No
    const bankAccName = company?.bank_account_name || company?.Bank_Account_Name
    const contactName = company?.contact_name || company?.Contact_Name || 'ฝ่ายบัญชี'

    const localeStr = lang === 'th' ? 'th-TH' : 'en-US'
    const issueDate = new Date(note.Billing_Date);
    const dueDate = new Date(issueDate.getTime() + (Number(note.Credit_Days) || 15) * 24 * 60 * 60 * 1000);

    // --- AGGREGATION LOGIC (Summary Mode) ---
    const summaryItems: { description: string; qty: number; unitPrice: number; total: number; isExtra?: boolean }[] = []
    
    let totalFreight = 0
    let minDate = new Date()
    let maxDate = new Date(0)
    
    jobs.forEach(job => {
        const d = new Date(job.Plan_Date)
        if (d < minDate) minDate = d
        if (d > maxDate) maxDate = d
        
        const storedT = Number(job.Price_Cust_Total || 0)
        const calculatedT = (Number(job.Price_Per_Unit) && Number(job.Loaded_Qty)) ? (Number(job.Price_Per_Unit) * Number(job.Loaded_Qty)) : 0
        totalFreight += storedT <= 0 ? calculatedT : storedT
    })

    if (jobs.length > 0) {
        const dateRange = minDate.getTime() === maxDate.getTime() 
            ? issueDate.toLocaleDateString(localeStr)
            : `${minDate.toLocaleDateString(localeStr)} - ${maxDate.toLocaleDateString(localeStr)}`
        
        summaryItems.push({
            description: `${lang === 'th' ? 'ค่าขนส่งสินค้า' : 'Freight Service'} (${dateRange}) - ${jobs.length} ${lang === 'th' ? 'เที่ยว' : 'Trips'}`,
            qty: jobs.length,
            unitPrice: totalFreight / jobs.length,
            total: totalFreight
        })
    }

    const extraGroups: Record<string, { count: number; total: number }> = {}
    jobs.forEach(job => {
        let costs: any[] = []
        try {
            if (job.extra_costs_json) {
                costs = typeof job.extra_costs_json === 'string' ? JSON.parse(job.extra_costs_json) : job.extra_costs_json
                if (typeof costs === 'string') costs = JSON.parse(costs)
            }
        } catch {}
        
        if (Array.isArray(costs)) {
            costs.forEach((c: any) => {
                if ((Number(c.charge_cust) || 0) > 0) {
                    const type = c.type || (lang === 'th' ? 'ค่าใช้จ่ายอื่นๆ' : 'Other Charges')
                    if (!extraGroups[type]) extraGroups[type] = { count: 0, total: 0 }
                    extraGroups[type].count += 1
                    extraGroups[type].total += Number(c.charge_cust)
                }
            })
        }
    })

    Object.entries(extraGroups).forEach(([type, data]) => {
        summaryItems.push({
            description: `${type} (${data.count} ${lang === 'th' ? 'รายการ' : 'Items'})`,
            qty: data.count,
            unitPrice: data.total / data.count,
            total: data.total,
            isExtra: true
        })
    })

    const subtotal = summaryItems.reduce((sum, item) => sum + item.total, 0)
    const wht = subtotal * 0.01 
    const netTotal = subtotal - wht

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 print-container font-sans">
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
                <PrintAction />
            </div>
            
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-6 print:w-full print:max-w-none print:p-0 text-sm">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={logoUrl} 
                                alt="Company Logo" 
                                className="h-16 w-auto object-contain print:block"
                            />
                        ) : null}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-600 mb-1 font-bold">(ต้นฉบับ)</div>
                        <div className="text-5xl font-bold text-blue-500 tracking-tight">ใบวางบิล</div>
                    </div>
                </div>

                {/* 2. Info Section */}
                <div className="flex justify-between gap-6 mb-8 text-slate-800 text-[13px]">
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1">
                            <div className="font-bold">ผู้ขาย :</div>
                            <div className="font-bold">{sellerName}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div>{sellerAddress || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div>{sellerTaxId || '-'}</div>
                        </div>
                        
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 mt-6">
                            <div className="font-bold">ลูกค้า :</div>
                            <div className="font-bold">{note.Customer_Name}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div>{note.Customer_Address || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div>{note.Customer_Tax_ID || '-'}</div>
                        </div>
                    </div>
                    
                    <div className="w-[320px]">
                        <div className="bg-slate-100/80 p-4 rounded-lg border border-slate-200 mb-4">
                            <div className="grid grid-cols-[130px_1fr] gap-y-1.5">
                                <div className="font-bold text-slate-700">เลขที่เอกสาร :</div>
                                <div>{note.Billing_Note_ID}</div>
                                <div className="font-bold text-slate-700">วันที่ออก :</div>
                                <div>{issueDate.toLocaleDateString(localeStr)}</div>
                                <div className="font-bold text-slate-700">เครดิต :</div>
                                <div>{note.Credit_Days || '15'} วัน</div>
                                <div className="font-bold text-slate-700">วันที่ครบกำหนด :</div>
                                <div>{dueDate.toLocaleDateString(localeStr)}</div>
                                <div className="font-bold text-slate-700">อ้างอิง :</div>
                                <div>-</div>
                            </div>
                        </div>
                        <div className="pl-4 border-l-2 border-slate-200">
                            <div className="font-bold mb-2">ติดต่อกลับที่ :</div>
                            <div className="flex items-center gap-3 mb-1.5"><User size={14} className="text-slate-600"/> {contactName}</div>
                            <div className="flex items-center gap-3 mb-1.5"><Phone size={14} className="text-slate-600"/> {sellerPhone || '-'}</div>
                            <div className="flex items-center gap-3"><Mail size={14} className="text-slate-600"/> {sellerEmail || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-[#eef2ff] text-slate-800 text-[13px] border-b-2 border-slate-300">
                            <th className="py-2 px-3 text-left font-bold w-12">ลำดับ</th>
                            <th className="py-2 px-3 text-left font-bold">คำอธิบาย</th>
                            <th className="py-2 px-3 text-center font-bold w-24">จำนวน</th>
                            <th className="py-2 px-3 text-right font-bold w-32">ราคา/หน่วย</th>
                            <th className="py-2 px-3 text-right font-bold w-32">มูลค่าก่อนภาษี</th>
                        </tr>
                    </thead>
                    <tbody className="text-[13px]">
                        {summaryItems.map((item, idx) => (
                            <tr key={idx} className={`border-b border-slate-100 ${item.isExtra ? 'text-slate-600' : 'font-semibold'}`}>
                                <td className="py-4 px-3 text-center align-top">{idx + 1}</td>
                                <td className="py-4 px-3 align-top">{item.description}</td>
                                <td className="py-4 px-3 text-center align-top">{item.qty.toFixed(2)}</td>
                                <td className="py-4 px-3 text-right align-top">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 px-3 text-right align-top">{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. Summary Totals */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px]">
                    <div className="w-8 flex justify-center mt-0.5"><FileText size={18} className="text-slate-800" /></div>
                    <div className="font-bold w-20">สรุป</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                            <div className="font-bold">มูลค่าไม่มีหรือยกเว้นภาษี</div>
                            <div className="pr-4">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</div>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="font-bold">จำนวนเงินทั้งสิ้น</div>
                            <div className="text-slate-600 flex-1 text-center italic">{ArabicNumberToText(subtotal)}</div>
                            <div className="bg-[#eef2ff] px-4 py-3 rounded w-72 flex justify-between items-center">
                                <span className="font-bold">จำนวนเงินทั้งสิ้น</span>
                                <span className="text-xl font-bold text-blue-600 tabular-nums">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.</span>
                            </div>
                        </div>
                        <div className="flex justify-end mb-2">
                            <div className="w-72 flex justify-between pr-4">
                                <span className="font-bold text-slate-500">หัก ณ ที่จ่าย (1%)</span>
                                <span className="tabular-nums">{wht.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <div className="w-72 flex justify-between pr-4">
                                <span className="font-bold">จำนวนเงินที่ชำระ</span>
                                <span className="font-bold tabular-nums">{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Bank Info */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px]">
                    <div className="w-8 flex justify-center mt-0.5"><CreditCard size={18} className="text-slate-800" /></div>
                    <div className="font-bold w-20">ชำระเงิน</div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-white p-1 rounded border border-slate-100 shadow-sm overflow-hidden">
                            <img src="/images/scb logo.jpg" alt="SCB Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">{bankName}</div>
                            <div className="font-bold text-slate-800">ออมทรัพย์ {bankAccNo || '-'}</div>
                            <div className="text-slate-600">{bankAccName || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 6. Remarks */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px]">
                    <div className="w-8 flex justify-center mt-0.5"><MessageSquare size={18} className="text-slate-800" /></div>
                    <div className="font-bold w-20">หมายเหตุ</div>
                    <div className="text-slate-700 whitespace-pre-wrap flex-1 leading-relaxed text-xs">
                        {note.Remarks || company?.invoice_notes || '"DD TRANSPORT ขอแจ้งการปรับเปลี่ยนสัญลักษณ์องค์กรใหม่ (LOGO)\nเพื่อให้มีความทันสมัย และเพื่อการสื่อสารที่ชัดเจนยิ่งขึ้น"\nตั้งแต่วันที่ 15 สิงหาคม 2567 เป็นต้นไป จึงขอเรียนแจ้งลูกค้าทุกท่านมา ณ โอกาสนี้'}
                    </div>
                </div>

                {/* 7. Signatures */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px]">
                    <div className="w-8 flex justify-center mt-0.5"><PenTool size={18} className="text-slate-800" /></div>
                    <div className="font-bold w-20">รับรอง</div>
                    <div className="flex-1 grid grid-cols-3 gap-8 text-center text-[10px] items-end pb-4">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-white flex items-center justify-center p-1 border-2 border-slate-200 rounded-lg shadow-sm mb-2 overflow-hidden">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://tms-app-five.vercel.app/public/invoice/${note.Billing_Note_ID}`)}`} alt="BN QR" className="w-full h-full" />
                            </div>
                            <div className="font-bold">สแกนเพื่อตรวจสอบ</div>
                        </div>
                        <div className="space-y-4">
                            <div className="border-b border-dashed border-slate-400 h-8"></div>
                            <div className="font-bold">ผู้ออกเอกสาร</div>
                            <div className="text-slate-500">{issueDate.toLocaleDateString(localeStr)}</div>
                        </div>
                        <div className="space-y-4">
                            <div className="border-b border-dashed border-slate-400 h-8"></div>
                            <div className="font-bold">ผู้รับเอกสาร (ลูกค้า)</div>
                            <div className="text-slate-500 italic">วันที่ ...............................</div>
                        </div>
                    </div>
                </div>
            </div>

            <style type="text/css" media="print">{`
                @page { size: A4; margin: 5mm; }
                body { visibility: hidden; background: white !important; -webkit-print-color-adjust: exact !important; }
                #printable-content, #printable-content * { visibility: visible; }
                #printable-content { position: absolute; left: 0; top: 0; width: 100%; }
            `}</style>
        </div>
    )
}
