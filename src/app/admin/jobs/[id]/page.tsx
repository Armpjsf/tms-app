import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { createAdminClient } from "@/lib/supabase/admin"
import { getJobRouteAdherence } from "@/lib/supabase/route-adherence"
import { ArrowLeft, MapPin, Route, Navigation, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: job } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Origin_Location, Dest_Location, Job_Status, Plan_Date, Est_Distance_KM, Total_Drop, original_destinations_json')
    .eq('Job_ID', id)
    .single()

  const adherence = await getJobRouteAdherence(id)

  // รายการจุดส่งทั้งหมด (multi-drop + จุดย่อยที่คนขับเพิ่มหน้างาน เช่น โกดัง)
  const allDrops: { name?: string; so_no?: string }[] = (() => {
    try {
      const raw = (job as { original_destinations_json?: string | unknown[] } | null)?.original_destinations_json
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-10 space-y-8 max-w-5xl mx-auto">
        <Link href="/jobs/history" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> กลับไปประวัติงาน
        </Link>

        {/* Header */}
        <div className="bg-background/60 border border-border/10 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Navigation size={24} /></div>
            <div>
              <h1 className="text-2xl font-black text-foreground">{job?.Job_ID || id}</h1>
              <p className="text-sm text-muted-foreground font-bold">{job?.Customer_Name || '-'} · {job?.Job_Status || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs font-bold block">คนขับ</span><span className="font-bold">{job?.Driver_Name || '-'}</span></div>
            <div><span className="text-muted-foreground text-xs font-bold block">ทะเบียนรถ</span><span className="font-bold">{job?.Vehicle_Plate || '-'}</span></div>
            <div><span className="text-muted-foreground text-xs font-bold block">เส้นทาง</span><span className="font-bold">{job?.Route_Name || `${job?.Origin_Location || '?'} → ${job?.Dest_Location || '?'}`}</span></div>
            <div><span className="text-muted-foreground text-xs font-bold block">วันที่</span><span className="font-bold">{job?.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}</span></div>
          </div>

          {/* จุดส่งทั้งหมด (multi-drop + จุดย่อยที่คนขับเพิ่มหน้างาน) */}
          {allDrops.length > 1 && (
            <div className="mt-6 pt-5 border-t border-border/10">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-black text-foreground">จุดส่งทั้งหมด</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[11px] font-bold border border-emerald-500/20">
                  {allDrops.length} จุด
                </span>
              </div>
              <ol className="space-y-1.5">
                {allDrops.map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-muted text-muted-foreground text-[11px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-bold text-foreground">
                      {d.name || `จุดส่งที่ ${i + 1}`}
                      {d.so_no && <span className="ml-2 text-[11px] font-semibold text-muted-foreground">SO: {d.so_no}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* 6.4 — แผน vs วิ่งจริง (เก็บจาก GPS อัตโนมัติ) */}
        <div className="bg-background/60 border border-border/10 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Route className="text-primary" size={20} />
            <h2 className="text-lg font-black text-foreground">แผน vs วิ่งจริง</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-2">เก็บจาก GPS อัตโนมัติ</span>
          </div>

          {!adherence || !adherence.hasGps ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              ยังไม่มีข้อมูล GPS เพียงพอสำหรับงานนี้ (คนขับอาจยังไม่ได้เริ่มวิ่ง หรือไม่ได้เปิดตำแหน่ง)
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="ระยะประเมิน (แผน)" value={adherence.plannedKm != null ? `${adherence.plannedKm} กม.` : '-'} />
                <Stat label="ระยะวิ่งจริง (GPS)" value={adherence.actualKm != null ? `${adherence.actualKm} กม.` : '-'} />
                <Stat
                  label="ต่างจากแผน"
                  value={adherence.deviationPct != null ? `${adherence.deviationPct > 0 ? '+' : ''}${adherence.deviationPct}%` : '-'}
                  tone={adherence.offRoute ? 'warn' : 'ok'}
                />
                <Stat label="ผ่านจุดที่วางแผน" value={`${adherence.stopsVisited}/${adherence.stopsTotal}`} />
              </div>

              <div className="flex items-center gap-2 text-sm flex-wrap">
                {adherence.offRoute ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                    <AlertTriangle size={16} /> วิ่งเกินแผนมาก ({adherence.deviationPct}%) — อาจมีการเลี่ยงเส้นทาง/จุดเพิ่ม
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
                    <CheckCircle2 size={16} /> วิ่งใกล้เคียงแผน
                  </span>
                )}
                <span className="text-xs text-muted-foreground">({adherence.gpsPoints} จุด GPS)</span>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * ระยะประเมินเป็นเที่ยวเดียว ระยะวิ่งจริงอาจรวมเที่ยวกลับ/เลี่ยงรถติด — ใช้ดูแนวโน้ม ไม่ใช่ค่าตายตัว
              </p>
            </div>
          )}

          <Link href={`/track/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-6 text-primary font-bold text-sm hover:underline">
            <MapPin size={14} /> ดูแผนที่/ไทม์ไลน์เต็ม <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border/5">
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{label}</span>
      <span className={`text-xl font-black ${tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}
