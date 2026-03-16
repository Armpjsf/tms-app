export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Search,
  Image as ImageIcon,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { getAllPODs, getPODStats } from "@/lib/supabase/pod"
import { PODExport } from "@/components/pod/pod-export"
import Link from "next/link"
import NextImage from "next/image"

export default async function PODPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const dateFrom = (searchParams.from as string) || ''
  const dateTo = (searchParams.to as string) || ''

  const [{ data: pods }, stats] = await Promise.all([
    getAllPODs(1, 100, dateFrom, dateTo), // Fetch more for export if needed
    getPODStats(),
  ])

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    Delivered: { label: "ส่งแล้ว", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    Complete: { label: "เสร็จสิ้น", color: "text-emerald-400 bg-emerald-500/20", icon: <CheckCircle2 size={14} /> },
    "In Transit": { label: "กำลังส่ง", color: "text-amber-400 bg-amber-500/20", icon: <Clock size={14} /> },
    "Picked Up": { label: "รับแล้ว", color: "text-emerald-500 bg-emerald-500/15", icon: <Clock size={14} /> },
    Failed: { label: "ล้มเหลว", color: "text-red-400 bg-red-500/20", icon: <AlertCircle size={14} /> },
  }

  return (
    <DashboardLayout>
      {/* Bespoke Elite Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <FileText size={32} />
            </div>
            จัดการ POD
          </h1>
          <p className="text-emerald-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Proof of Delivery - หลักฐานการจัดส่ง</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <PODExport data={pods} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl p-6 bg-emerald-500/5 border border-emerald-500/20 shadow-lg group hover:bg-emerald-500/10 transition-all duration-300">
          <p className="text-3xl font-black text-emerald-500 mb-1">{stats.total}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60">งานวันนี้</p>
        </div>
        <div className="rounded-2xl p-6 bg-emerald-500/5 border border-emerald-500/20 shadow-lg group hover:bg-emerald-500/10 transition-all duration-300">
          <p className="text-3xl font-black text-emerald-400 mb-1">{stats.complete}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60">ส่งสำเร็จ</p>
        </div>
        <div className="rounded-2xl p-6 bg-blue-500/5 border border-blue-500/20 shadow-lg group hover:bg-blue-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-1">
            <ImageIcon size={20} className="text-blue-400" />
            <p className="text-3xl font-black text-blue-400">{stats.withPhoto}</p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60">มีรูปถ่าย</p>
        </div>
        <div className="rounded-2xl p-6 bg-purple-500/5 border border-purple-500/20 shadow-lg group hover:bg-purple-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-1">
            <PenTool size={20} className="text-purple-400" />
            <p className="text-3xl font-black text-purple-400">{stats.withSignature}</p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400/60">มีลายเซ็น</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl">
        <form className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full relative">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">ค้นหา (Search)</Label>
            <Search className="absolute left-3 top-[38px] text-slate-500" size={18} />
            <Input 
              name="q"
              placeholder="ค้นหา Job ID, ลูกค้า, คนขับ..." 
              className="pl-10 h-12 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" 
              defaultValue={searchParams.q as string || ''}
            />
          </div>
          <div className="w-full md:w-[220px]">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">วันที่เริ่มต้น (From Date)</Label>
            <Input 
                type="date" 
                name="from" 
                defaultValue={dateFrom} 
                className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" 
            />
          </div>
          <div className="w-full md:w-[220px]">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">วันที่สิ้นสุด (To Date)</Label>
            <Input 
                type="date" 
                name="to" 
                defaultValue={dateTo} 
                className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" 
            />
          </div>
          <Button type="submit" className="h-12 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 w-full md:w-auto transition-all active:scale-95">
             <Search className="w-4 h-4 mr-2" /> ค้นหา
          </Button>
        </form>
      </div>

      {/* POD Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {pods.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              ไม่พบข้อมูล POD
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">Job ID</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">วันที่</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">คนขับ</th>
                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">รูปถ่าย</th>
                    <th className="text-center p-4 text-xs font-medium text-gray-500 uppercase">ลายเซ็น</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((pod) => (
                    <tr 
                      key={pod.Job_ID} 
                      className="border-b border-gray-200 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <Link href={`/admin/jobs/${pod.Job_ID}`}>
                          <span className="text-emerald-600 font-medium text-sm hover:underline cursor-pointer">{pod.Job_ID}</span>
                        </Link>
                      </td>
                      <td className="p-4 text-sm text-gray-700">
                        {pod.Plan_Date ? new Date(pod.Plan_Date).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : "-"}
                      </td>
                      <td className="p-4 text-sm text-slate-900 font-medium">{pod.Customer_Name || "-"}</td>
                      <td className="p-4 text-sm text-gray-700">{pod.Driver_Name || "-"}</td>
                      <td className="p-4 text-center">
                        {pod.Photo_Proof_Url ? (
                          <div className="relative w-10 h-10 mx-auto rounded border border-border overflow-hidden bg-muted group">
                            <NextImage 
                                src={pod.Photo_Proof_Url.split(',')[0]} 
                                alt="POD" 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform" 
                            />
                            <a href={pod.Photo_Proof_Url.split(',')[0]} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {pod.Signature_Url ? (
                           <div className="relative w-14 h-10 mx-auto rounded border border-border overflow-hidden bg-white group">
                           <NextImage 
                               src={pod.Signature_Url} 
                               alt="Signature" 
                               fill 
                               className="object-contain p-1 group-hover:scale-110 transition-transform" 
                           />
                           <a href={pod.Signature_Url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                         </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[pod.Job_Status]?.color || 'text-gray-500 bg-slate-500/20'
                        }`}>
                          {statusConfig[pod.Job_Status]?.icon}
                          {statusConfig[pod.Job_Status]?.label || pod.Job_Status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/admin/jobs/${pod.Job_ID}`}>
                          <Button variant="ghost" size="sm" className="hover:bg-emerald-500/10">ดูรายละเอียด</Button>
                        </Link>
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
