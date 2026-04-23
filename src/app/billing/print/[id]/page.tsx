import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/billing/print-button"
import { dictionaries, Language } from "@/lib/i18n/dictionaries"
import { Phone, Mail, User, FileText, CreditCard, MessageSquare, PenTool, Globe as GlobeIcon } from "lucide-react"
import { headers } from "next/headers"


export const dynamic = 'force-dynamic'

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ lang?: string }>;
}

function ArabicNumberToText(Number: number) {
    if (Number === undefined || Number === null || isNaN(Number)) return "";
    const numStr = Number.toFixed(2);
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const fractionalPart = parts[1];

    const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function readNumber(num: string) {
        if (num === '0' || num === '00') return '';
        let result = '';
        const len = num.length;
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

function safeLocaleDateString(date: Date, locale: string) {
    try {
        if (!date || isNaN(date.getTime())) return '-';
        return date.toLocaleDateString(locale);
    } catch {
        return '-';
    }
}

export default async function BillingPrintPage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { id } = params
    const lang = (searchParams?.lang as Language) || 'th'
    
    const data = await getBillingNoteByIdWithJobs(id)

    // Get current host for QR code
    const host = (await headers()).get('host') || ''
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$/.test(host) || host.startsWith('localhost')
    const proto = (await headers()).get('x-forwarded-proto') || (isIP ? 'http' : (process.env.NODE_ENV === 'development' ? 'http' : 'https'))
    const baseUrl = `${proto}://${host}`


    if (!data || !data.note) {
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

    // Map for aggregating items by category
    const aggregatedItems = new Map<string, { 
        description: string; 
        subDescription?: string; 
        qty: number; 
        unitPrice: number; 
        totalBeforeTax: number; 
        isExtra: boolean; 
    }>()

    let minDate: Date | null = null
    let maxDate: Date | null = null

    // Helper to format date range in Thai/BE
    function formatBEDateRange(start: Date, end: Date) {
        const sD = start.getDate()
        const eD = end.getDate()
        const sM = start.getMonth() + 1
        const sY = start.getFullYear() + 543
        
        if (sD === eD && start.getMonth() === end.getMonth()) {
            return `${sD}/${sM}/${sY}`
        }
        return `${sD}-${eD}/${sM}/${sY}`
    }

    jobs.forEach((job) => {
        const jobDate = new Date(job.Plan_Date)
        if (!minDate || jobDate < minDate) minDate = jobDate
        if (!maxDate || jobDate > maxDate) maxDate = jobDate

        const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 1)
        const unitPrice = Number(job.Price_Per_Unit || 0)
        
        // 1. Freight (Sum into single row)
        let basePrice = Number(job.Price_Cust_Total || 0)
        if (basePrice <= 0 && unitPrice > 0) {
            basePrice = qty * unitPrice
        }

        const freightKey = 'FREIGHT'
        const existingFreight = aggregatedItems.get(freightKey)
        if (existingFreight) {
            existingFreight.qty += 1
            existingFreight.totalBeforeTax += basePrice
        } else {
            aggregatedItems.set(freightKey, {
                description: `ค่าขนส่งสินค้า (${job.Customer_ID || 'P00001'})`,
                qty: 1,
                unitPrice: 0, // Calculated later
                totalBeforeTax: basePrice,
                isExtra: false
            })
        }

        // 2. Standard Extra Cost Columns
        const EXPENSE_MAP: Record<string, string> = {
            'Price_Cust_Extra': 'เพิ่มจุดลงของ',
            'Charge_Labor': 'แรงงานยกของ',
            'Charge_Wait': 'รอลงเกินเวลา',
            'Price_Cust_Other': 'อื่นๆ'
        }

        const standardExtras = ['Price_Cust_Extra', 'Charge_Labor', 'Charge_Wait', 'Price_Cust_Other']
        standardExtras.forEach(col => {
            const val = Number(job[col] || 0)
            if (val > 0) {
                const key = `EXTRA-${col}`
                const existing = aggregatedItems.get(key)
                if (existing) {
                    existing.qty += 1
                    existing.totalBeforeTax += val
                } else {
                    aggregatedItems.set(key, {
                        description: lang === 'th' ? EXPENSE_MAP[col] : col.replace(/_/g, ' '),
                        qty: 1,
                        unitPrice: 0,
                        totalBeforeTax: val,
                        isExtra: true
                    })
                }
            }
        })

        // 3. JSON Extras
        let jsonExtras: any[] = []
        try {
            if (job.extra_costs_json) {
                let costs = job.extra_costs_json
                if (typeof costs === 'string') { try { costs = JSON.parse(costs) } catch {} }
                if (Array.isArray(costs)) jsonExtras = costs
            }
        } catch {}

        jsonExtras.filter(e => Number(e.charge_cust) > 0).forEach((extra) => {
            const val = Number(extra.charge_cust)
            const typeLabel = extra.type || (lang === 'th' ? 'ค่าใช้จ่ายเพิ่มเติม' : 'Extra Cost')
            const mappedLabel = typeLabel === 'Pallet' ? 'ค่าพาเลท' : typeLabel
            const key = `JSON-${mappedLabel}`
            
            const existing = aggregatedItems.get(key)
            if (existing) {
                existing.qty = (existing.qty || 0) + 1
                existing.totalBeforeTax += val
            } else {
                aggregatedItems.set(key, {
                    description: mappedLabel,
                    qty: 1,
                    unitPrice: 0,
                    totalBeforeTax: val,
                    isExtra: true
                })
            }
        })
    })

    // Finalize description with date range for main freight
    const freightItem = aggregatedItems.get('FREIGHT')
    if (freightItem && minDate && maxDate) {
        freightItem.subDescription = `--ค่าขนส่งสินค้า วันที่ ${formatBEDateRange(minDate, maxDate)}`
    }

    // Convert Map to list for display
    const displayItems = Array.from(aggregatedItems.values()).map(item => ({
        ...item,
        unitPrice: item.totalBeforeTax / item.qty 
    }))
    
    const totalPreTax = displayItems.reduce((acc, curr) => acc + curr.totalBeforeTax, 0)

    const wht = note.WHT_Amount ?? ((totalPreTax - (note.Discount_Amount || 0)) * (note.WHT_Rate || 1) / 100)
    const netTotal = (note.Total_Amount || (totalPreTax - (note.Discount_Amount || 0) + (note.VAT_Amount || 0))) - wht

    const localeStr = lang === 'th' ? 'th-TH' : 'en-US'
    const issueDate = note.Billing_Date ? new Date(note.Billing_Date) : new Date();
    const creditDays = Number(note.Credit_Days || 15)
    const dueDate = !isNaN(issueDate.getTime()) 
        ? new Date(issueDate.getTime() + creditDays * 24 * 60 * 60 * 1000)
        : new Date();

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 print-container font-sans">
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
                <PrintButton />
            </div>
            
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-4 print:w-full print:max-w-none print:p-0 text-[12px]">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={logoUrl} 
                                alt="Company Logo" 
                                className="h-12 w-auto object-contain print:block" 
                                style={{ display: 'block' }}
                            />
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] text-slate-600 mb-0 font-bold">(ต้นฉบับ)</div>
                        <div className="text-4xl font-bold text-blue-500 tracking-tight leading-none">ใบวางบิล</div>
                    </div>
                </div>

                {/* 2. Info Section */}
                <div className="flex justify-between gap-4 mb-4 text-slate-800 text-[12px]">
                    <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5">
                            <div className="font-bold">ผู้ขาย :</div>
                            <div className="font-bold">{sellerName}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div className="leading-tight">{sellerAddress || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div>{sellerTaxId || '-'}</div>
                        </div>
                        
                        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5 mt-2">
                            <div className="font-bold">ลูกค้า :</div>
                            <div className="font-bold">{note.Customer_Name}</div>
                            <div className="font-bold">ที่อยู่ :</div>
                            <div className="leading-tight">{note.Customer_Address || '-'}</div>
                            <div className="font-bold">เลขที่ภาษี :</div>
                            <div>{note.Customer_Tax_ID || '-'}</div>
                        </div>
                    </div>
                    
                    <div className="w-[280px]">
                        <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200 mb-2">
                            <div className="grid grid-cols-[110px_1fr] gap-y-1">
                                <div className="font-bold text-slate-700">เลขที่เอกสาร :</div>
                                <div>{note.Billing_Note_ID}</div>
                                <div className="font-bold text-slate-700">วันที่ออก :</div>
                                <div>{safeLocaleDateString(issueDate, localeStr)}</div>
                                <div className="font-bold text-slate-700">เครดิต :</div>
                                <div>{note.Credit_Days || '15'} วัน</div>
                                <div className="font-bold text-slate-700">วันที่ครบกำหนด :</div>
                                <div>{safeLocaleDateString(dueDate, localeStr)}</div>
                            </div>
                        </div>
                        <div className="pl-3 border-l-2 border-slate-200 text-[11px]">
                            <div className="font-bold mb-1">ติดต่อกลับที่ :</div>
                            <div className="flex items-center gap-2 mb-0.5"><User size={12} className="text-slate-600"/> {contactName}</div>
                            <div className="flex items-center gap-2 mb-0.5"><Phone size={12} className="text-slate-600"/> {sellerPhone || '-'}</div>
                            <div className="flex items-center gap-2"><Mail size={12} className="text-slate-600"/> {sellerEmail || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <table className="w-full mb-4 border-collapse">
                    <thead>
                        <tr className="bg-[#eef2ff] text-slate-800 text-[12px] border-b-2 border-slate-300">
                            <th className="py-1.5 px-2 text-left font-bold w-10">ลำดับ</th>
                            <th className="py-1.5 px-2 text-left font-bold">คำอธิบาย</th>
                            <th className="py-1.5 px-2 text-center font-bold w-20">จำนวน</th>
                            <th className="py-1.5 px-2 text-right font-bold w-28">ราคา</th>
                            <th className="py-1.5 px-2 text-right font-bold w-20">ส่วนลด</th>
                            <th className="py-1.5 px-2 text-center font-bold w-20">VAT</th>
                            <th className="py-1.5 px-2 text-right font-bold w-28">มูลค่าก่อนภาษี</th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px]">
                        {displayItems.map((item, idx) => (
                            <tr key={idx} className={`border-b border-slate-100 ${item.isExtra ? 'text-slate-600 italic' : 'font-semibold'}`}>
                                <td className="py-1.5 px-2 text-center align-top">{idx + 1}</td>
                                <td className="py-1.5 px-2 align-top">
                                    <div className="leading-tight">{item.description}</div>
                                    {item.subDescription && <div className="text-[10px] text-slate-500 font-normal mt-0">{item.subDescription}</div>}
                                </td>
                                <td className="py-1.5 px-2 text-center align-top">{item.qty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="py-1.5 px-2 text-right align-top">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="py-1.5 px-2 text-right align-top">0.00</td>
                                <td className="py-1.5 px-2 text-center align-top">ไม่มี</td>
                                <td className="py-1.5 px-2 text-right align-top">{item.totalBeforeTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. Summary Section */}
                <div className="border-t border-slate-200 pt-3 mt-4 flex gap-4 text-[12px]">
                    <div className="w-6 flex justify-center mt-0.5"><FileText size={16} className="text-slate-800" /></div>
                    <div className="font-bold w-16">สรุป</div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-700">มูลค่าก่อนส่วนลด (Gross Amount)</span>
                            <span className="pr-4">{totalPreTax.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between items-center mb-0.5 text-slate-500 italic text-[11px]">
                            <span>ส่วนลด (Discount)</span>
                            <span className="pr-4">{(note.Discount_Amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-700">มูลค่าหลังหักส่วนลด (Net Amount)</span>
                            <span className="pr-4">{(totalPreTax - (note.Discount_Amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-slate-500 italic text-[11px]">
                            <span>ภาษีมูลค่าเพิ่ม (VAT {note.VAT_Rate || 0}%)</span>
                            <span className="pr-4">{(note.VAT_Amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <div className="font-bold">จำนวนเงินทั้งสิ้น</div>
                            <div className="text-slate-600 flex-1 text-center italic text-[11px] px-2">{ArabicNumberToText(note.Total_Amount || totalPreTax)}</div>
                            <div className="bg-[#eef2ff] px-3 py-2 rounded w-72 flex justify-between items-center border border-blue-100">
                                <span className="font-bold">จำนวนเงินทั้งสิ้น</span>
                                <span className="text-lg font-bold text-blue-600 tracking-tight">{(note.Total_Amount || totalPreTax).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-800 font-normal">บาท</span></span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5">
                            <div className="w-72 flex justify-between pr-4 border-b border-dashed border-slate-200 pb-0.5 text-[11px]">
                                <span className="font-bold text-slate-700">หัก ณ ที่จ่าย (WHT {note.WHT_Rate || 1}%)</span>
                                <span>{wht.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                            <div className="w-72 flex justify-between pr-4 pt-0.5">
                                <span className="font-bold text-base text-blue-800">ยอดชำระสุทธิ</span>
                                <span className="font-bold text-base text-blue-800">{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Payment Section */}
                <div className="border-t border-slate-200 pt-3 mt-4 flex gap-4 text-[12px] page-break-avoid">
                    <div className="w-6 flex justify-center mt-0.5"><CreditCard size={16} className="text-slate-800" /></div>
                    <div className="font-bold w-16">ชำระเงิน</div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden bg-white p-1 rounded border border-slate-100">
                            <img 
                                src="/images/scb logo.jpg" 
                                alt="SCB Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 leading-none">{bankName}</div>
                            <div className="font-bold text-slate-800 mt-1 leading-none text-[11px]">ออมทรัพย์ {bankAccNo || '-'}</div>
                            <div className="text-slate-600 mt-0.5 leading-none text-[10px]">{bankAccName || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* 6. Notes Section */}
                <div className="border-t border-slate-200 pt-3 mt-4 flex gap-4 text-[11px]">
                    <div className="w-6 flex justify-center mt-0.5"><MessageSquare size={16} className="text-slate-800" /></div>
                    <div className="font-bold w-16">หมายเหตุ</div>
                    <div className="text-slate-700 whitespace-pre-wrap flex-1 leading-relaxed italic opacity-80">
                        {note.Remarks || company?.invoice_notes || '"DD TRANSPORT ขอแจ้งการปรับเปลี่ยนสัญลักษณ์องค์กรใหม่ (LOGO)...'}
                    </div>
                </div>

                {/* 7. Signatures Section */}
                <div className="border-t border-slate-200 pt-3 mt-4 flex gap-4 text-[11px] page-break-avoid">
                    <div className="w-6 flex justify-center mt-0.5"><PenTool size={16} className="text-slate-800" /></div>
                    <div className="font-bold w-16">รับรอง</div>
                    <div className="flex-1 flex gap-4">
                        <div className="w-24 shrink-0 flex flex-col items-center">
                            <div className="text-[10px] text-slate-500 mb-1 text-center font-bold">สแกนเปิดเอกสาร</div>
                            <div className="w-20 h-20 bg-white flex items-center justify-center p-1 border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/public/invoice/${id}?lang=${lang}&mode=print`)}`}
                                    alt="Billing QR Code"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-2 text-center text-[10px] items-end pb-1">
                            <div>
                                <div className="h-10 border-b border-dashed border-slate-400 mb-1 mx-1"></div>
                                <div className="font-bold mb-0.5 whitespace-nowrap">ผู้ออกเอกสาร (ผู้ขาย)</div>
                                <div className="text-slate-600 truncate">{contactName}</div>
                                <div className="text-slate-500 text-[9px]">{safeLocaleDateString(issueDate, localeStr)}</div>
                            </div>
                            <div>
                                <div className="h-10 border-b border-dashed border-slate-400 mb-1 mx-1"></div>
                                <div className="font-bold mb-0.5 whitespace-nowrap">ผู้อนุมัติ (ผู้ขาย)</div>
                                <div className="text-slate-600 truncate">{contactName}</div>
                                <div className="text-slate-500 text-[9px]">{safeLocaleDateString(issueDate, localeStr)}</div>
                            </div>
                            <div className="flex flex-col items-center relative">
                                <div className="h-10 flex items-center justify-center mb-1">
                                    {company?.stamp_url ? (
                                        <img 
                                            src={company.stamp_url} 
                                            alt="Company Stamp" 
                                            className="absolute w-20 h-20 object-contain opacity-70 -top-6 rotate-[-10deg] pointer-events-none"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-[7px] font-bold p-1 opacity-30 rotate-[-15deg]">
                                            COMPANY<br/>STAMP
                                        </div>
                                    )}
                                </div>
                                <div className="font-bold whitespace-nowrap mt-4">ตราประทับ</div>
                            </div>                            <div>
                                <div className="h-10 border-b border-dashed border-slate-400 mb-1 mx-1"></div>
                                <div className="font-bold mb-0.5 whitespace-nowrap">ผู้รับ (ลูกค้า)</div>
                                <div className="text-slate-600 truncate px-1">{note.Customer_Name}</div>
                            </div>
                            <div>
                                <div className="h-10 border border-dashed border-slate-300 mb-1 bg-slate-50/50"></div>
                                <div className="font-bold whitespace-nowrap">ตราประทับ (ลูกค้า)</div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                <style type="text/css" media="print">{`
                @page { size: A4; margin: 5mm 8mm; }
                body { visibility: hidden; background: white !important; -webkit-print-color-adjust: exact !important; }
                #printable-content, #printable-content * { visibility: visible; }
                #printable-content { width: 100%; background: white !important; padding: 0 !important; }
                .page-break-avoid { break-inside: avoid; }
                img { display: block !important; opacity: 1 !important; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                `}</style>        </div>
    )
}
