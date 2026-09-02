import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Banknote, Calendar, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

interface SummaryJob {
  Job_ID: string
  Plan_Date: string | null
  Cost_Driver_Total: number | null
  Job_Status: string | null
  Customer_Name: string | null
  Show_Price_To_Driver?: boolean | null
}

export default async function IncomeSummaryPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const supabase = await createClient()
  
  // Fetch all completed/delivered jobs for this driver
  const { data: jobs } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Cost_Driver_Total, Job_Status, Customer_Name, Show_Price_To_Driver')
    .eq('Driver_ID', session.driverId)
    .in('Job_Status', ['Completed', 'Delivered'])
    .order('Plan_Date', { ascending: false })

  const totalEarnings = jobs?.filter((j: SummaryJob) => j.Show_Price_To_Driver !== false)
    .reduce((sum: number, j: SummaryJob) => sum + (j.Cost_Driver_Total || 0), 0) || 0
  const totalJobs = jobs?.length || 0

  return (
    <div className="min-h-full bg-background pb-24 pt-16 px-4">
      <MobileHeader 
        title="สรุปรายได้" 
      />

      <div className="space-y-4">
        {/* Total Summary Card */}
        <div className="rounded-2xl overflow-hidden relative p-5" style={{ background: 'var(--pd-hi)', boxShadow: 'var(--pd-lift-2)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Banknote size={110} className="text-white rotate-12" />
          </div>
          <div className="relative z-10">
            <p className="text-white/85 text-sm font-medium mb-1">รายได้รวมสะสม (งานที่จบแล้ว)</p>
            <h2 className="text-[38px] font-bold text-white leading-none mb-4 pd-num">
              ฿{totalEarnings.toLocaleString()}
            </h2>
            <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 backdrop-blur">
              <CheckCircle2 size={16} className="text-white" />
              <span className="text-white font-semibold text-sm pd-num">{totalJobs} งานสำเร็จ</span>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-2.5">
          <h3 className="text-muted-foreground font-semibold text-xs uppercase tracking-wide flex items-center gap-1.5 px-1">
            <Calendar size={13} /> ประวัติงานที่สำเร็จ
          </h3>

          {totalJobs === 0 ? (
            <div className="text-center py-12 rounded-2xl text-muted-foreground text-sm" style={{ background: 'var(--pd-paper)', border: '1px dashed var(--pd-line)' }}>
              ยังไม่มีประวัติงานที่สำเร็จ
            </div>
          ) : (
            <div className="space-y-2">
              {jobs?.map((job: SummaryJob) => (
                <div key={job.Job_ID} className="bg-card border border-border rounded-xl p-3.5 flex justify-between items-center" style={{ boxShadow: 'var(--pd-lift-1)' }}>
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">{job.Customer_Name || job.Job_ID}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 pd-num">
                      {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    {job.Show_Price_To_Driver !== false ? (
                      <p className="font-bold text-sm pd-num" style={{ color: 'var(--pd-go)' }}>+฿{job.Cost_Driver_Total?.toLocaleString()}</p>
                    ) : (
                      <p className="text-muted-foreground font-bold text-sm">***</p>
                    )}
                    <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-muted-foreground mt-0.5">
                      <CheckCircle2 size={11} style={{ color: 'var(--pd-go)' }} /> สำเร็จ
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

