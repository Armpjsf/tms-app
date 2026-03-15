
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DataSection } from "@/components/ui/data-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  Download,
  MoreHorizontal,
  FileCheck,
  FileText
} from "lucide-react"
import Link from "next/link"
import { getInvoices } from "@/lib/supabase/invoices"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>
}) {
  const resolvedParams = await searchParams
  const page = Number(resolvedParams?.page) || 1
  const query = resolvedParams?.query || ""
  
  const { data: invoices } = await getInvoices(page, 20, query)
  const safeInvoices = Array.isArray(invoices) ? invoices : []

  return (
    <DashboardLayout>
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl shadow-2xl shadow-purple-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <FileText size={32} />
            </div>
            ใบกำกับภาษี
          </h1>
          <p className="text-purple-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Tax Invoices & Financial Documentation</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <Link href="/billing/invoices/create">
            <Button className="h-14 px-8 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/20">
              <Plus size={24} className="mr-2" />
              ออกใบกำกับภาษี
            </Button>
          </Link>
        </div>
      </div>

      <DataSection title="รายการใบกำกับภาษี" icon={<FileText size={18} />}
        headerAction={
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search Invoice ID..."
                    className="pl-9 w-[250px] bg-white/80 border-gray-200 rounded-xl"
                    defaultValue={query}
                />
            </div>
        }
      >
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-gray-500">เลขที่เอกสาร</TableHead>
                  <TableHead className="text-gray-500">ลูกค้า</TableHead>
                  <TableHead className="text-gray-500">วันที่</TableHead>
                  <TableHead className="text-gray-500">วันครบกำหนด</TableHead>
                  <TableHead className="text-right text-gray-500">ยอดสุทธิ</TableHead>
                  <TableHead className="text-center text-gray-500">สถานะ</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeInvoices.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                            ไม่พบรายการใบกำกับภาษี
                        </TableCell>
                    </TableRow>
                ) : (
                    safeInvoices.map((inv: Record<string, unknown>) => (
                      <TableRow key={inv.Invoice_ID as string} className="border-gray-200 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-gray-800">
                            <div className="flex flex-col">
                                <span>{inv.Invoice_ID as string}</span>
                                {inv.Tax_Invoice_ID && (
                                    <span className="text-xs text-gray-400">{inv.Tax_Invoice_ID as string}</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{inv.Customer_Name as string}</TableCell>
                        <TableCell className="text-gray-500">
                            {inv.Issue_Date ? new Date(inv.Issue_Date as string).toLocaleDateString('th-TH') : '-'}
                        </TableCell>
                        <TableCell className="text-gray-500">
                            {inv.Due_Date ? new Date(inv.Due_Date as string).toLocaleDateString('th-TH') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-800">
                            {Number(inv.Grand_Total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={`
                                ${inv.Status === 'Paid' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 
                                  inv.Status === 'Sent' ? 'border-blue-500 text-emerald-600 bg-blue-500/10' :
                                  inv.Status === 'Overdue' ? 'border-red-500 text-red-500 bg-red-500/10' :
                                  'border-slate-500 text-gray-400 bg-slate-500/10'}
                            `}>
                                {inv.Status as string}
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-gray-200">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="focus:bg-gray-100 cursor-pointer">
                                <FileCheck className="mr-2 h-4 w-4" /> ดูรายละเอียด
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-gray-100 cursor-pointer" asChild>
                                <Link href={`/billing/print/${inv.Invoice_ID as string}`} target="_blank">
                                  <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด PDF
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
      </DataSection>
    </DashboardLayout>
  )
}
