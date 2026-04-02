import React from "react"
import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { dictionaries, Language } from "@/lib/i18n/dictionaries"
import { 
    Phone, Mail, User, FileText, CreditCard, MessageSquare, PenTool, 
    Globe as GlobeIcon, CalendarDays, ShieldCheck 
} from "lucide-react"

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

export default async function PublicInvoicePage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { id } = params
    const lang = (searchParams?.lang as Language) || 'th'
    
    // We use the same fetching logic. Internal function handles admin/non-admin client
    const data = await getBillingNoteByIdWithJobs(id)

    if (!data) {
        return notFound()
    }

    const { note, jobs, company } = data

    // Unified Data Access
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

    const subtotal = jobs.reduce((sum, job) => {
        const base = job.Price_Cust_Total || 0
        let extra = 0
        try {
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') {
                    try { costs = JSON.parse(costs) } catch {}
                }
                if (Array.isArray(costs)) {
                    extra = costs
                        .filter((c: any) => (Number(c.charge_cust) || 0) > 0)
                        .reduce((acc: number, c: any) => acc + (Number(c.charge_cust) || 0), 0)
                }
            }
        } catch {}
        return sum + base + extra
    }, 0)

    const wht = subtotal * 0.01
    const netTotal = subtotal - wht

    const localeStr = lang === 'th' ? 'th-TH' : 'en-US'
    const issueDate = new Date(note.Billing_Date);
    const dueDate = new Date(issueDate.getTime() + (note.Credit_Days || 15) * 24 * 60 * 60 * 1000);

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-8 text-black font-sans">
            {/* Page Container */}
            <div className="max-w-[210mm] mx-auto bg-white p-6 md:p-12 shadow-xl rounded-xl border border-slate-200">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                        {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={logoUrl} 
                                alt="Company Logo" 
                                className="h-20 w-auto object-contain" 
                            />
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-500 mb-1 font-bold uppercase tracking-widest">E-Invoice</div>
                        <div className="text-5xl font-black text-blue-600 tracking-tight">ใบแจ้งหนี้</div>
                    </div>
                </div>

                {/* 2. Info Section */}
                <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 text-slate-800 text-sm">
                    <div className="flex-1 space-y-6">
                        {/* Seller */}
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1">
                            <div className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">ผู้ขาย / Seller</div>
                            <div className="font-black text-lg text-slate-900 leading-none mb-1">{sellerName}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div className="text-slate-600">{sellerAddress || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div className="font-mono">{sellerTaxId || '-'}</div>
                        </div>
                        
                        {/* Customer */}
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 pt-6 border-t border-slate-100">
                            <div className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">ลูกค้า / Bill To</div>
                            <div className="font-black text-lg text-slate-900 leading-none mb-1">{note.Customer_Name}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div className="text-slate-600">{note.Customer_Address || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div className="font-mono">{note.Customer_Tax_ID || '-'}</div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-[320px]">
                        {/* Doc Info Box */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-6 shadow-sm">
                            <div className="grid grid-cols-[130px_1fr] gap-y-2">
                                <div className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">เลขที่เอกสาร</div>
                                <div className="font-black text-blue-700">{note.Billing_Note_ID}</div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">วันที่ออก</div>
                                <div className="font-bold">{issueDate.toLocaleDateString(localeStr)}</div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">เครดิต</div>
                                <div className="font-bold">{note.Credit_Days || '15'} วัน</div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">กำหนดชำระ</div>
                                <div className="font-black text-rose-600">{dueDate.toLocaleDateString(localeStr)}</div>
                            </div>
                        </div>
                        {/* Contact Info */}
                        <div className="pl-6 border-l-4 border-blue-600">
                            <div className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Customer Support</div>
                            <div className="flex items-center gap-3 mb-2 font-bold"><User size={16} className="text-blue-600"/> {contactName}</div>
                            <div className="flex items-center gap-3 mb-2 font-bold"><Phone size={16} className="text-blue-600"/> {sellerPhone || '-'}</div>
                            <div className="flex items-center gap-3 font-bold"><Mail size={16} className="text-blue-600"/> {sellerEmail || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 mb-12 shadow-sm">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="py-4 px-4 text-left font-black uppercase tracking-widest w-12 text-[10px]">#</th>
                                <th className="py-4 px-4 text-left font-black uppercase tracking-widest text-[10px]">รายละเอียดรายการ</th>
                                <th className="py-4 px-4 text-center font-black uppercase tracking-widest w-24 text-[10px]">จำนวน</th>
                                <th className="py-4 px-4 text-right font-black uppercase tracking-widest w-32 text-[10px]">ราคา/หน่วย</th>
                                <th className="py-4 px-4 text-right font-black uppercase tracking-widest w-32 text-[10px]">รวมเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job, index) => {
                                let extraCosts: any[] = []
                                try {
                                    if (job.extra_costs_json) {
                                        let parsed = job.extra_costs_json
                                        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed) } catch {} }
                                        if (Array.isArray(parsed)) extraCosts = parsed
                                    }
                                } catch {}

                                const chargeableExtras = extraCosts.filter(c => (Number(c.charge_cust) || 0) > 0)

                                return (
                                    <React.Fragment key={job.Job_ID}>
                                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-4 align-top text-center font-bold text-slate-400">{index + 1}</td>
                                            <td className="py-4 px-4 align-top">
                                                <div className="font-black text-slate-900">ค่าขนส่งสินค้า (Job ID: {job.Job_ID})</div>
                                                <div className="text-slate-500 text-xs mt-1 italic flex items-center gap-2">
                                                    <CalendarDays size={12} /> {new Date(job.Plan_Date).toLocaleDateString(localeStr)} | {job.Route_Name}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center align-top font-bold text-slate-600">1.00</td>
                                            <td className="py-4 px-4 text-right align-top font-bold">
                                                {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 text-right align-top font-black text-slate-900">
                                                {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        {chargeableExtras.map((extra, i) => (
                                            <tr key={`${job.Job_ID}-extra-${i}`} className="border-b border-slate-50 bg-slate-50/30 text-slate-600">
                                                <td className="py-2 px-4"></td>
                                                <td className="py-2 px-4 pl-8 text-xs font-bold italic flex items-center gap-2">
                                                    <span className="text-blue-400">↳</span> {extra.type}
                                                </td>
                                                <td className="py-2 px-4 text-center text-xs">1.00</td>
                                                <td className="py-2 px-4 text-right text-xs">
                                                    {Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-4 text-right text-xs font-bold">
                                                    {Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 4. Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare size={18} className="text-blue-600" />
                                <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400">หมายเหตุ / Remarks</h4>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                                {note.Remarks || company?.invoice_notes || 'กรุณาชำระเงินภายในวันที่กำหนด เพื่อรักษาสิทธิประโยชน์ในการใช้บริการ'}
                            </p>
                        </div>
                        
                        <div className="p-6 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <CreditCard size={100} />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <CreditCard size={18} />
                                <h4 className="font-black uppercase text-[10px] tracking-widest opacity-80">ข้อมูลการชำระเงิน</h4>
                            </div>
                            <div className="relative z-10 space-y-1">
                                <p className="font-black text-lg">{bankName}</p>
                                <p className="font-mono text-2xl tracking-tighter">{bankAccNo || '-'}</p>
                                <p className="font-bold opacity-90">{bankAccName || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full" />
                        
                        <div className="flex justify-between items-center text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <span>ยอดรวมก่อนภาษี / Subtotal</span>
                            <span className="text-lg text-white font-bold">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-rose-400 uppercase text-[10px] font-black tracking-widest border-t border-white/10 pt-4">
                            <span>หัก ณ ที่จ่าย (1%) / WHT</span>
                            <span className="text-lg font-bold">-{wht.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-8">
                            <div className="flex justify-between items-end mb-4">
                                <div className="space-y-1">
                                    <p className="text-blue-400 uppercase text-[10px] font-black tracking-widest">ยอดชำระสุทธิ</p>
                                    <p className="text-3xl font-black italic tracking-tighter">NET TOTAL</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-400 mb-1">บาท / THB</p>
                                    <p className="text-5xl font-black tracking-tighter text-blue-400 italic">
                                        {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 text-center">
                                <p className="text-xs font-bold text-slate-400 italic">{ArabicNumberToText(netTotal)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-slate-400">
                        <ShieldCheck size={24} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Security Verified</p>
                            <p className="text-[8px] font-bold">เอกสารนี้ถูกสร้างและยืนยันความถูกต้องผ่านระบบ TMS</p>
                        </div>
                    </div>
                    <div className="text-right text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
                        LogisPro Digital Documents
                    </div>
                </div>
            </div>
        </div>
    )
}
