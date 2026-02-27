
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
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
  FileText, 
  Plus, 
  Search, 
  Download,
  MoreHorizontal,
  FileCheck,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { getInvoices } from "@/lib/supabase/invoices"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  
  const { data: invoices, count } = await getInvoices(page, 20, query)

  return (
    <DashboardLayout>
      <PageHeader
        icon={<FileText size={28} />}
        title="ใบกำกับภาษี (Tax Invoices)"
        subtitle="จัดการและออกใบกำกับภาษีเต็มรูป"
        actions={
          <Link href="/billing/invoices/create">
            <Button className="h-11 px-6 rounded-xl gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/20">
              <Plus size={18} />
              ออกใบกำกับภาษี
            </Button>
          </Link>
        }
      />

      <DataSection title="รายการใบกำกับภาษี" icon={<FileText size={18} />}
        headerAction={
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search Invoice ID..."
                    className="pl-9 w-[250px] bg-slate-900/60 border-slate-800 rounded-xl"
                    defaultValue={query}
                />
            </div>
        }
      >
          <div className="rounded-md border border-slate-800/50">
            <Table>
              <TableHeader className="bg-slate-800/30">
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">เลขที่เอกสาร</TableHead>
                  <TableHead className="text-slate-400">ลูกค้า</TableHead>
                  <TableHead className="text-slate-400">วันที่</TableHead>
                  <TableHead className="text-slate-400">วันครบกำหนด</TableHead>
                  <TableHead className="text-right text-slate-400">ยอดสุทธิ</TableHead>
                  <TableHead className="text-center text-slate-400">สถานะ</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                            ไม่พบรายการใบกำกับภาษี
                        </TableCell>
                    </TableRow>
                ) : (
                    invoices.map((inv: any) => (
                      <TableRow key={inv.Invoice_ID} className="border-slate-800 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-slate-200">
                            <div className="flex flex-col">
                                <span>{inv.Invoice_ID}</span>
                                {inv.Tax_Invoice_ID && (
                                    <span className="text-xs text-slate-500">{inv.Tax_Invoice_ID}</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{inv.Customer_Name}</TableCell>
                        <TableCell className="text-slate-400">{new Date(inv.Issue_Date).toLocaleDateString('th-TH')}</TableCell>
                        <TableCell className="text-slate-400">
                            {inv.Due_Date ? new Date(inv.Due_Date).toLocaleDateString('th-TH') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-200">
                            {Number(inv.Grand_Total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={`
                                ${inv.Status === 'Paid' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 
                                  inv.Status === 'Sent' ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                                  inv.Status === 'Overdue' ? 'border-red-500 text-red-500 bg-red-500/10' :
                                  'border-slate-500 text-slate-500 bg-slate-500/10'}
                            `}>
                                {inv.Status}
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
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="focus:bg-slate-800 cursor-pointer">
                                <FileCheck className="mr-2 h-4 w-4" /> ดูรายละเอียด
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-slate-800 cursor-pointer" asChild>
                                <Link href={`/billing/print/${inv.Invoice_ID}`} target="_blank">
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
