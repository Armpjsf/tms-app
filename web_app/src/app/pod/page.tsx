import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileText, 
  Search,
  Download,
  Image,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { getAllPODs, getPODStats } from "@/lib/supabase/pod"

export default async function PODPage() {
  const [{ data: pods }, stats] = await Promise.all([
    getAllPODs(1, 50),
    getPODStats(),
  ])

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    "In Transit": { label: "กำลังส่ง", color: "text-amber-400 bg-amber-500/20", icon: <Clock size={14} /> },
    "Picked Up": { label: "รับแล้ว", color: "text-blue-400 bg-blue-500/20", icon: <Clock size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="text-indigo-400" />
            จัดการ POD
          </h1>
          <p className="text-slate-400">Proof of Delivery - หลักฐานการจัดส่ง</p>
        </div>
        <Button size="lg" className="gap-2">
          <Download size={20} />
          ดาวน์โหลดรายงาน
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-2xl font-bold text-indigo-400">{stats.total}</p>
          <p className="text-xs text-slate-400">งานวันนี้</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.complete}</p>
          <p className="text-xs text-slate-400">ส่งสำเร็จ</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-blue-400" />
            <p className="text-2xl font-bold text-blue-400">{stats.withPhoto}</p>
          </div>
          <p className="text-xs text-slate-400">มีรูปถ่าย</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <PenTool size={16} className="text-purple-400" />
            <p className="text-2xl font-bold text-purple-400">{stats.withSignature}</p>
          </div>
          <p className="text-xs text-slate-400">มีลายเซ็น</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input placeholder="ค้นหา Job ID, ลูกค้า, คนขับ..." className="pl-10 h-11" />
        </div>
      </div>

      {/* POD Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {pods.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              ไม่พบข้อมูล POD
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">Job ID</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">วันที่</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ลูกค้า</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">คนขับ</th>
                    <th className="text-center p-4 text-xs font-medium text-slate-400 uppercase">รูปถ่าย</th>
                    <th className="text-center p-4 text-xs font-medium text-slate-400 uppercase">ลายเซ็น</th>
                    <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">สถานะ</th>
                    <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((pod) => (
                    <tr 
                      key={pod.Job_ID} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-indigo-400 font-medium text-sm">{pod.Job_ID}</span>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{pod.Plan_Date || "-"}</td>
                      <td className="p-4 text-sm text-white">{pod.Customer_Name || "-"}</td>
                      <td className="p-4 text-sm text-slate-300">{pod.Driver_Name || "-"}</td>
                      <td className="p-4 text-center">
                        {pod.Photo_Proof_Url ? (
                          <Image size={18} className="mx-auto text-emerald-400" />
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {pod.Signature_Url ? (
                          <PenTool size={18} className="mx-auto text-purple-400" />
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[pod.Job_Status]?.color || 'text-slate-400 bg-slate-500/20'
                        }`}>
                          {statusConfig[pod.Job_Status]?.icon}
                          {statusConfig[pod.Job_Status]?.label || pod.Job_Status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">ดูรายละเอียด</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
