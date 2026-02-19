
import { getInvoiceById } from "@/lib/supabase/invoices"
import { PrintButton } from "@/components/billing/print-button"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const { data: invoice } = await getInvoiceById(resolvedParams.id)

  if (!invoice) return <div className="p-8 text-white">Invoice Not Found</div>

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white text-slate-200 print:text-black p-8 font-sans">
        {/* Actions - Hidden on Print */}
        <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print-hidden">
            <Link href="/billing/invoices">
                <Button variant="ghost" className="text-slate-400 hover:text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับ
                </Button>
            </Link>
            <PrintButton />
        </div>

        {/* Invoice Paper */}
        <div className="max-w-[210mm] mx-auto bg-white text-black p-[15mm] shadow-xl print:shadow-none print:p-0 min-h-[297mm]">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                     {/* Company Logo/Name logic here (Hardcoded for now as placeholder) */}
                     <h1 className="text-2xl font-bold text-indigo-800">LOGIS-PRO 360</h1>
                     <p className="text-sm text-gray-500">
                        123 Transport Lane, Logistics City<br/>
                        Bangkok, 10110<br/>
                        Tax ID: 0105551234567
                     </p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">TAX INVOICE</h2>
                    <div className="text-sm">
                        <p><span className="font-bold">No:</span> {invoice.Invoice_ID}</p>
                        <p><span className="font-bold">Date:</span> {new Date(invoice.Issue_Date).toLocaleDateString('th-TH')}</p>
                        {invoice.Due_Date && (
                            <p><span className="font-bold">Due Date:</span> {new Date(invoice.Due_Date).toLocaleDateString('th-TH')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8 p-4 border rounded bg-gray-50 print:bg-transparent print:border-gray-200">
                <h3 className="font-bold mb-2 border-b pb-1 text-gray-700">Bill To:</h3>
                <p className="font-bold text-lg">{invoice.customers?.Customer_Name}</p>
                <p className="text-sm whitespace-pre-line text-gray-600">{invoice.customers?.Billing_Address || invoice.customers?.Address || 'No Address'}</p>
                <p className="text-sm mt-1 text-gray-600">Tax ID: {invoice.customers?.Tax_ID || '-'}</p>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm mb-8 border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 print:bg-gray-50">
                        <th className="p-3 text-left w-12 text-gray-600">#</th>
                        <th className="p-3 text-left text-gray-600">Description</th>
                        <th className="p-3 text-right w-32 text-gray-600">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.Items_JSON && Array.isArray(invoice.Items_JSON) ? (
                        invoice.Items_JSON.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="p-3 align-top">{idx + 1}</td>
                                <td className="p-3">
                                    <div className="font-bold text-gray-800">{item.Route_Name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Job ID: {item.Job_ID} | Date: {new Date(item.Plan_Date).toLocaleDateString('th-TH')}
                                    </div>
                                </td>
                                <td className="p-3 text-right align-top font-medium">{Number(item.Price_Cust_Total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={3} className="p-4 text-center">No Items</td></tr>
                    )}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{Number(invoice.Subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.VAT_Rate > 0 && (
                        <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">VAT ({invoice.VAT_Rate}%)</span>
                            <span className="font-medium">{Number(invoice.VAT_Amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Grand Total</span>
                        <span>{Number(invoice.Grand_Total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.WHT_Amount > 0 && (
                        <div className="flex justify-between text-sm text-red-600 border-t pt-2 border-dashed mt-2">
                            <span>Less WHT ({invoice.WHT_Rate}%)</span>
                            <span>-{Number(invoice.WHT_Amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-xl border-2 border-gray-200 pt-3 pb-3 px-4 bg-gray-50 mt-4 rounded print:border-black print:bg-transparent">
                        <span>Net Payment</span>
                        <span>{Number(invoice.Net_Total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-12 mt-20 pt-8 page-break-inside-avoid">
                <div className="text-center">
                    <div className="border-b border-black mb-2 w-3/4 mx-auto h-8"></div>
                    <p className="text-sm font-bold">Authorized Signature</p>
                    <p className="text-xs text-gray-500 mt-1">LOGIS-PRO 360</p>
                    <p className="text-xs text-gray-400 mt-1">Date: ____/____/____</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black mb-2 w-3/4 mx-auto h-8"></div>
                    <p className="text-sm font-bold">Customer Signature</p>
                    <p className="text-xs text-gray-500 mt-1">Received By</p>
                    <p className="text-xs text-gray-400 mt-1">Date: ____/____/____</p>
                </div>
            </div>
            
            {/* Notes */}
            {invoice.Notes && (
                <div className="mt-12 pt-4 border-t text-sm text-gray-500 print:text-xs">
                    <strong className="text-gray-700">Notes:</strong> {invoice.Notes}
                </div>
            )}
        </div>
    </div>
  )
}
