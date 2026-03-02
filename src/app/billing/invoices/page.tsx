
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
                {invoices.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                            ไม่พบรายการใบกำกับภาษี
                        </TableCell>
                    </TableRow>
                ) : (
                    invoices.map((inv: any) => (
                      <TableRow key={inv.Invoice_ID} className="border-gray-200 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-gray-800">
                            <div className="flex flex-col">
                                <span>{inv.Invoice_ID}</span>
                                {inv.Tax_Invoice_ID && (
                                    <span className="text-xs text-gray-400">{inv.Tax_Invoice_ID}</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{inv.Customer_Name}</TableCell>
                        <TableCell className="text-gray-500">{new Date(inv.Issue_Date).toLocaleDateString('th-TH')}</TableCell>
                        <TableCell className="text-gray-500">
                            {inv.Due_Date ? new Date(inv.Due_Date).toLocaleDateString('th-TH') : '-'}
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
                            <DropdownMenuContent align="end" className="bg-white border-gray-200">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="focus:bg-gray-100 cursor-pointer">
                                <FileCheck className="mr-2 h-4 w-4" /> ดูรายละเอียด
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-gray-100 cursor-pointer" asChild>
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
