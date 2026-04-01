import { getBillingNoteByIdWithJobs } from "@/lib/supabase/billing"
import { notFound } from "next/navigation"
import { AutoPrint } from "@/components/utils/auto-print"
import { PrintAction } from "./print-button"
import { dictionaries, Language } from "@/lib/i18n/dictionaries"

export const dynamic = 'force-dynamic'

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ lang?: string }>;
}

export default async function BillingPrintPage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { id } = params
    const lang = (searchParams?.lang as Language) || 'th'
    const dict = dictionaries[lang] || dictionaries.th
    const t = dict.billing_note
    
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

    const total = subtotal

    const localeStr = lang === 'th' ? 'th-TH' : 'en-US'
    const displayCompanyName = (lang === 'en' && company?.company_name_en) 
        ? company.company_name_en 
        : (company?.company_name || '')

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 print-container">
            <AutoPrint />
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
                <PrintAction />
            </div>
            
            {/* A4 Page Container */}
            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-4 print:w-full print:max-w-none print:p-0">
                
                {/* Header with Logo */}
                <div className="flex justify-between items-center mb-6 border-b-2 border-slate-800 pb-4">
                    <div className="flex items-center gap-6">
                        {company?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={company.logo_url} 
                                alt="Company Logo" 
                                className="h-16 w-auto object-contain print:block" 
                                style={{ display: 'block' }}
                            />
                        ) : company?.company_name ? (
                             <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded text-xs font-bold text-muted-foreground uppercase text-center p-2">NO LOGO</div>
                        ) : null}
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{t.title}</h1>
                            {lang === 'th' && <p className="text-sm font-bold text-slate-500 tracking-[0.2em] mt-1">BILLING NOTE</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded text-xl font-bold inline-block border border-slate-200">
                            # {note.Billing_Note_ID}
                        </div>
                        <div className="text-base font-bold text-slate-500 mt-2">
                            {t.date}: {new Date(note.Billing_Date).toLocaleDateString(localeStr)}
                        </div>
                    </div>
                </div>

                {/* Addresses - Compact */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.bill_from}</h3>
                        {company ? (
                            <div className="text-base text-slate-700 leading-snug">
                                <p className="font-bold text-slate-900 text-lg mb-1">{displayCompanyName}</p>
                                <p className="text-base line-clamp-2 mb-2">{company.address}</p>
                                <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-slate-600">
                                    <span>{t.tax_id_label}: {company.tax_id}</span>
                                    {company.phone && <span>{t.tel_label}: {company.phone}</span>}
                                </div>
                            </div>
                        ) : (
                            <p className="text-base font-bold text-red-500">({t.set_company_info})</p>
                        )}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.bill_to}</h3>
                        <div className="text-base text-slate-700 leading-snug">
                            <p className="font-bold text-slate-900 text-lg mb-1">{note.Customer_Name}</p>
                            {note.Customer_Address ? (
                                <>
                                    <p className="text-base line-clamp-2 mb-2">{note.Customer_Address}</p>
                                    <div className="pt-2 border-t border-slate-200 font-bold text-sm text-slate-600">
                                        {t.tax_id_label}: {note.Customer_Tax_ID || '-'}
                                    </div>
                                </>
                            ) : (
                                <span className="text-slate-400 text-base italic">{t.no_address}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table - Very Compact */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-white text-xs font-black uppercase tracking-widest">
                            <th className="py-3 px-4 text-left rounded-tl">{t.no}</th>
                            <th className="py-3 px-4 text-center">{t.date}</th>
                            <th className="py-3 px-4 text-left">{t.description}</th>
                            <th className="py-3 px-4 text-right rounded-tr">{t.amount}</th>
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
                                <tbody key={job.Job_ID} className="text-base border-b border-slate-100 italic-none">
                                    <tr>
                                        <td className="py-3 px-4 align-top font-bold text-slate-400">{index + 1}</td>
                                        <td className="py-3 px-4 text-center align-top whitespace-nowrap text-slate-600">
                                            {new Date(job.Plan_Date).toLocaleDateString(localeStr)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900">{lang === 'th' ? 'ค่าขนส่ง' : 'Freight Service'} (Job: {job.Job_ID})</div>
                                            <div className="text-slate-500 text-sm mt-0.5">{job.Route_Name}</div>
                                        </td>
                                        <td className="py-3 px-4 text-right align-top font-black text-slate-900">
                                            {job.Price_Cust_Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    {chargeableExtras.map((extra, i) => (
                                        <tr key={`${job.Job_ID}-extra-${i}`} className="text-slate-500 bg-slate-50/30 text-sm">
                                            <td className="py-1.5 px-4" colSpan={2}></td>
                                            <td className="py-1.5 px-4 flex items-center gap-2">
                                                <span className="text-slate-300">↳</span>
                                                <span>{extra.type}</span>
                                            </td>
                                            <td className="py-1.5 px-4 text-right font-bold">{Number(extra.charge_cust).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            )
                        })}
                </table>

                {/* Totals and Remarks - Side by Side */}
                <div className="flex justify-between items-start gap-12 mb-8 break-inside-avoid">
                    <div className="flex-1 bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 italic">{t.remarks}</h4>
                        <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                            <p className="flex items-start gap-2">
                                <span className="text-primary font-bold">•</span>
                                {t.payment_method}
                            </p>
                            {company?.bank_name && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex justify-between flex-wrap gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900">{t.bank}: {company.bank_name}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">{t.account_name}: {company.bank_account_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 tracking-wider">
                                                {company.bank_account_no}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Digital Settlement ID</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-72 space-y-2">
                        <div className="flex justify-between text-base font-bold text-slate-500 uppercase tracking-widest">
                            <span className="text-xs">{t.subtotal}</span>
                            <span className="text-slate-900">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-end text-slate-900 border-t-2 border-slate-900 pt-4 mt-2">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t.total}</span>
                            <div className="text-right">
                                <span className="text-2xl font-black italic-none leading-none">
                                    <span className="text-sm font-bold mr-1 text-slate-400 italic">฿</span>
                                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signatures Area - Compact */}
                <div className="grid grid-cols-2 gap-12 mt-12 pt-12 border-t border-slate-100 page-break-avoid">
                    <div className="text-center">
                        <div className="h-16 border-b border-dashed border-slate-300 mb-3 mx-8"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                            {lang === 'th' ? 'Authorized Signature' : 'ENTITY VERIFIER'}
                        </p>
                        <p className="text-base font-bold text-slate-700 uppercase tracking-widest italic">{t.authorized_signature}</p>
                    </div>
                    <div className="text-center">
                        <div className="h-16 border-b border-dashed border-slate-300 mb-3 mx-8"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                            {lang === 'th' ? 'Receiver Signature' : 'CLIENT ACKNOWLEDGMENT'}
                        </p>
                        <p className="text-base font-bold text-slate-700 uppercase tracking-widest italic">{t.receiver_signature}</p>
                    </div>
                </div>

                {/* Secure Footer */}
                <div className="mt-16 text-center opacity-30 flex flex-col items-center gap-2 print:hidden">
                    <div className="h-px w-20 bg-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">LogisPro Fiscal Protocol v4.2</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Digitally encrypted & verified cloud document</p>
                </div>
            </div>

            <style type="text/css" media="print">{`
                @page { 
                    size: A4; 
                    margin: 5mm 10mm; 
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
                    height: 18mm !important; 
                    width: auto !important;
                    max-width: 65mm !important;
                    object-fit: contain !important;
                }
                .italic-none { font-style: normal !important; }
            `}</style>
        </div>
    )
}
