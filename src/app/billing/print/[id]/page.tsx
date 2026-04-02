import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { AutoPrint } from "@/components/utils/auto-print"
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
    const dict = dictionaries[lang] || dictionaries.th
    
    const data = await getBillingNoteByIdWithJobs(id)

    if (!data) {
        return notFound()
    }

    const { note, jobs, company } = data

    // Unified Data Access (Support both accounting_profile and company_profile)
    const logoUrl = company?.logo_url || company?.Logo_URL || '/images/account logo.png'
    const sellerName = company?.company_name_th || company?.Company_Name_TH || (lang === 'th' ? company?.company_name : company?.company_name_en)
    const sellerAddress = company?.address || company?.Address
    const sellerTaxId = company?.tax_id || company?.Tax_ID
    const sellerPhone = company?.phone || company?.Phone
    const sellerEmail = company?.email || company?.Email
    const sellerWebsite = company?.website || company?.Website
    
    const bankName = company?.bank_name || company?.Bank_Name || 'ธนาคารไทยพาณิชย์ (SCB)'
    const bankAccNo = company?.bank_account_no || company?.Bank_Account_No
    const bankAccName = company?.bank_account_name || company?.Bank_Account_Name
    const contactName = company?.contact_name || company?.Contact_Name || 'ฝ่ายบัญชี'

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
                        .filter((c: { charge_cust?: number }) => (Number(c.charge_cust) || 0) > 0)
                        .reduce((acc: number, c: { charge_cust?: number }) => acc + (Number(c.charge_cust) || 0), 0)
                }
            }
        } catch {}
        return sum + base + extra
    }, 0)

    const wht = subtotal * 0.01 // Assuming 1% WHT for transport
    const netTotal = subtotal - wht

    const localeStr = lang === 'th' ? 'th-TH' : 'en-US'

    const issueDate = new Date(note.Billing_Date);
    const dueDate = new Date(issueDate.getTime() + (note.Credit_Days || 15) * 24 * 60 * 60 * 1000);

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 print-container font-sans">
            <AutoPrint />
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
                <PrintAction />
            </div>
            
            {/* A4 Page Container */}
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
                                style={{ display: 'block' }}
                            />
                        ) : (
                             <div className="h-16 px-4 bg-slate-900 text-white flex flex-col items-center justify-center font-black uppercase text-center rounded">
                                <span className="text-xl leading-none tracking-widest text-red-500">D<span className="text-white">D</span></span>
                                <span className="text-[8px] mt-1 opacity-80">TRANSPORT</span>
                             </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-600 mb-1 font-bold">(ต้นฉบับ)</div>
                        <div className="text-5xl font-bold text-blue-500 tracking-tight">ใบแจ้งหนี้</div>
                    </div>
                </div>

                {/* 2. Info Section */}
                <div className="flex justify-between gap-6 mb-8 text-slate-800 text-[13px]">
                    <div className="flex-1 space-y-4">
                        {/* Seller */}
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1">
                            <div className="font-bold">ผู้ขาย :</div>
                            <div className="font-bold">{sellerName}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div>{sellerAddress || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div className="flex justify-between">
                                <span>{sellerTaxId || '-'}</span>
                            </div>
                        </div>
                        
                        {/* Customer */}
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 mt-6">
                            <div className="font-bold">ลูกค้า :</div>
                            <div className="font-bold">{note.Customer_Name}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div>{note.Customer_Address || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div className="flex justify-between">
                                <span>{note.Customer_Tax_ID || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-[320px]">
                        {/* Doc Info Box */}
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
                        {/* Contact Info */}
                        <div className="pl-4 border-l-2 border-slate-200">
                            <div className="font-bold mb-2">ติดต่อกลับที่ :</div>
                            <div className="flex items-center gap-3 mb-1.5"><User size={14} className="text-slate-600"/> {contactName}</div>
                            <div className="flex items-center gap-3 mb-1.5"><Phone size={14} className="text-slate-600"/> {sellerPhone || '-'}</div>
                            <div className="flex items-center gap-3"><Mail size={14} className="text-slate-600"/> {sellerEmail || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table (Kept original logic, styled to match sample) */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-[#eef2ff] text-slate-800 text-[13px] border-b-2 border-slate-300">
                            <th className="py-2 px-3 text-left font-bold w-12">ลำดับ</th>
                            <th className="py-2 px-3 text-left font-bold">คำอธิบาย (วันที่ดำเนินการ)</th>
                            <th className="py-2 px-3 text-center font-bold w-24">จำนวน</th>
                            <th className="py-2 px-3 text-right font-bold w-32">ราคา/หน่วย</th>
                            <th className="py-2 px-3 text-right font-bold w-32">มูลค่าก่อนภาษี</th>
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

                            const chargeableExtras = extraCosts.filter(c => (Number(c.charge_cust) || 0) > 0)

                            return (
                                <tbody key={job.Job_ID} className="text-[13px] border-b border-slate-100">
                                    <tr>
                                        <td className="py-3 px-3 align-top text-center">{index + 1}</td>
                                        <td className="py-3 px-3 align-top">
                                            <div className="font-bold">{lang === 'th' ? 'ค่าขนส่งสินค้า' : 'Freight Service'} (Job: {job.Job_ID})</div>
                                            <div className="text-slate-600 mt-1">-- ดำเนินการวันที่ {new Date(job.Plan_Date).toLocaleDateString(localeStr)} ({job.Route_Name})</div>
                                        </td>
                                        <td className="py-3 px-3 text-center align-top">1.00</td>
                                        <td className="py-3 px-3 text-right align-top">
                                            {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-right align-top">
                                            {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    {chargeableExtras.map((extra, i) => (
                                        <tr key={`${job.Job_ID}-extra-${i}`} className="text-slate-600 text-[13px]">
                                            <td className="py-1 px-3"></td>
                                            <td className="py-1 px-3 pl-6">
                                                -- {extra.type}
                                            </td>
                                            <td className="py-1 px-3 text-center">1.00</td>
                                            <td className="py-1 px-3 text-right">{Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="py-1 px-3 text-right">{Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {chargeableExtras.length > 0 && <tr><td colSpan={5} className="h-2"></td></tr>}
                                </tbody>
                            )
                        })}
                </table>

                {/* 4. Summary Section */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px]">
                    <div className="w-8 flex justify-center mt-0.5">
                        <FileText size={18} className="text-slate-800" />
                    </div>
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
                                <span className="text-xl font-bold text-blue-600 tracking-tight">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm text-slate-800 font-normal">บาท</span></span>
                            </div>
                        </div>
                        <div className="flex justify-end mb-2">
                            <div className="w-72 flex justify-between pr-4">
                                <span className="font-bold">จำนวนเงินที่หัก ณ ที่จ่าย (1%)</span>
                                <span>{wht.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <div className="w-72 flex justify-between pr-4">
                                <span className="font-bold">จำนวนเงินที่ชำระ</span>
                                <span className="font-bold">{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Payment Section */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px] page-break-avoid">
                    <div className="w-8 flex justify-center mt-0.5">
                        <CreditCard size={18} className="text-slate-800" />
                    </div>
                    <div className="font-bold w-20">ชำระเงิน</div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden bg-white p-1 rounded border border-slate-100 shadow-sm">
                            <img 
                                src="/images/scb logo.jpg" 
                                alt="SCB Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">{bankName}</div>
                            <div className="font-bold text-slate-800 mt-0.5">ออมทรัพย์ {bankAccNo || '-'}</div>
                            <div className="text-slate-600 mt-0.5">{bankAccName || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 6. Notes Section */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px] page-break-avoid">
                    <div className="w-8 flex justify-center mt-0.5">
                        <MessageSquare size={18} className="text-slate-800" />
                    </div>
                    <div className="font-bold w-20">หมายเหตุ</div>
                    <div className="text-slate-700 whitespace-pre-wrap flex-1 leading-relaxed">
                        {note.Remarks || company?.invoice_notes || '"DD TRANSPORT ขอแจ้งการปรับเปลี่ยนสัญลักษณ์องค์กรใหม่ (LOGO)\nเพื่อให้มีความทันสมัย และเพื่อการสื่อสารที่ชัดเจนยิ่งขึ้น"\nตั้งแต่วันที่ 15 สิงหาคม 2567 เป็นต้นไป จึงขอเรียนแจ้งลูกค้าทุกท่านมา ณ โอกาสนี้'}
                    </div>
                </div>

                {/* 7. Signatures Section */}
                <div className="border-t border-slate-200 pt-4 mt-8 flex gap-4 text-[13px] page-break-avoid">
                    <div className="w-8 flex justify-center mt-0.5">
                        <PenTool size={18} className="text-slate-800" />
                    </div>
                    <div className="font-bold w-20">รับรอง</div>
                    <div className="flex-1 flex gap-6">
                        <div className="w-24 shrink-0 flex flex-col items-center">
                            <div className="text-[10px] text-slate-500 mb-1 text-center font-bold">สแกนเพื่อเปิดใบวางบิล</div>
                            <div className="w-20 h-20 bg-white flex items-center justify-center p-1 border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/public/invoice/${note.Billing_Note_ID}`)}`} 
                                    alt="Billing QR Code" 
                                    className="w-full h-full object-contain" 
                                />
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-3 text-center text-xs items-end">
                            <div>
                                <div className="h-16 border-b border-dashed border-slate-400 mb-2 mx-2"></div>
                                <div className="font-bold mb-1">ผู้ออกเอกสาร (ผู้ขาย)</div>
                                <div className="text-slate-600">{contactName}</div>
                                <div className="text-slate-500 mt-0.5">{issueDate.toLocaleDateString(localeStr)}</div>
                            </div>
                            <div>
                                <div className="h-16 border-b border-dashed border-slate-400 mb-2 mx-2"></div>
                                <div className="font-bold mb-1">ผู้อนุมัติเอกสาร (ผู้ขาย)</div>
                                <div className="text-slate-600">{contactName}</div>
                                <div className="text-slate-500 mt-0.5">{issueDate.toLocaleDateString(localeStr)}</div>
                            </div>
                            <div>
                                <div className="h-16 flex items-center justify-center mb-2">
                                    <div className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-[8px] font-bold p-1 opacity-40 rotate-[-15deg]">
                                        COMPANY<br/>STAMP
                                    </div>
                                </div>
                                <div className="font-bold">ตราประทับ (ผู้ขาย)</div>
                            </div>
                            <div>
                                <div className="h-16 border-b border-dashed border-slate-400 mb-2 mx-2"></div>
                                <div className="font-bold mb-1">ผู้รับเอกสาร (ลูกค้า)</div>
                                <div className="text-slate-600 px-1 break-words">{note.Customer_Name}</div>
                            </div>
                            <div>
                                <div className="h-16 border border-dashed border-slate-300 mb-2 bg-slate-50/50"></div>
                                <div className="font-bold">ตราประทับ (ลูกค้า)</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style type="text/css" media="print">{`
                @page { 
                    size: A4; 
                    margin: 10mm; 
                }
                body { 
                    visibility: hidden; 
                    background: white !important;
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
                }
            `}</style>
        </div>
    )
}

function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

