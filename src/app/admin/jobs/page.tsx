import Link from "next/link"
import { getAllJobs } from "@/lib/supabase/jobs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import { redirect } from "next/navigation"

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const query = params.q || ""
  const limit = 20

  const { data: jobs, count } = await getAllJobs(page, limit, query)
  const totalPages = Math.ceil(count / limit)

  async function searchAction(formData: FormData) {
    "use server"
    const q = formData.get("q") as string
    redirect(`/admin/jobs?q=${q}&page=1`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Management</h1>
          <p className="text-slate-400">จัดการและติดตามสถานะงานขนส่งทั้งหมด ({count} งาน)</p>
        </div>
        <Link href="/admin/jobs/create">
            <Button>+ สร้างงานใหม่</Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 max-w-md">
        <form action={searchAction} className="flex w-full gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                name="q"
                type="search"
                placeholder="ค้นหาเลข Job, ลูกค้า, หรือคนขับ..."
                className="pl-9 bg-slate-900 border-slate-800 text-white"
                defaultValue={query}
                />
            </div>
            <Button type="submit" variant="secondary">ค้นหา</Button>
        </form>
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-400">Job ID</TableHead>
              <TableHead className="text-slate-400">วันที่ส่ง</TableHead>
              <TableHead className="text-slate-400">ลูกค้า</TableHead>
              <TableHead className="text-slate-400">เส้นทาง</TableHead>
              <TableHead className="text-slate-400">คนขับ / ทะเบียน</TableHead>
              <TableHead className="text-slate-400">สถานะ</TableHead>
              <TableHead className="text-right text-slate-400">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  ไม่พบข้อมูลงาน
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.Job_ID} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-slate-200">{job.Job_ID}</TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(job.Plan_Date || "").toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell className="text-slate-300">{job.Customer_Name}</TableCell>
                  <TableCell className="text-slate-400">{job.Route_Name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="text-slate-300">{job.Driver_Name || "-"}</span>
                        <span className="text-xs text-slate-500">{job.Vehicle_Plate}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.Job_Status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/jobs/${job.Job_ID}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-slate-400">
            <span>หน้า {page} จาก {totalPages}</span>
            <div className="flex gap-1">
                <Link href={`/admin/jobs?q=${query}&page=${Math.max(1, page - 1)}`} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 bg-slate-900" disabled={page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <Link href={`/admin/jobs?q=${query}&page=${Math.min(totalPages, page + 1)}`} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-slate-700 bg-slate-900" disabled={page >= totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
    let colorClass = "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20" // Default
  
    switch (status) {
      case "New":
        colorClass = "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20"
        break
      case "Assigned":
        colorClass = "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20"
        break
      case "In Progress":
      case "In Transit":
        colorClass = "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20"
        break
      case "Delivered":
      case "Completed":
        colorClass = "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
        break
      case "Cancelled":
        colorClass = "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/20"
        break
      case "Failed":
      case "SOS":
        colorClass = "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
        break
    }
  
    return (
      <Badge variant="outline" className={`border ${colorClass}`}>
        {status}
      </Badge>
    )
}
