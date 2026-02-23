
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="text-purple-400" />
            ใบกำกับภาษี (Tax Invoices)
          </h1>
          <p className="text-slate-400">จัดการและออกใบกำกับภาษีเต็มรูป</p>
        </div>
        <div className="flex gap-3">
          <Link href="/billing/invoices/create">
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus size={18} />
              ออกใบกำกับภาษี
            </Button>
          </Link>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium text-slate-200">รายการใบกำกับภาษี</CardTitle>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search Invoice ID..."
                        className="pl-9 w-[250px] bg-slate-800 border-slate-700"
                        defaultValue={query}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader className="bg-slate-800/50">
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
                      <TableRow key={inv.Invoice_ID} className="border-slate-800 hover:bg-slate-800/30">
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
                            Running...
                            {/* {inv.Grand_Total.toLocaleString(undefined, { minimumFractionDigits: 2 })} */}
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
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
