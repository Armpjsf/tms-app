import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Banknote, ChevronLeft, Calendar, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function IncomeSummaryPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const supabase = await createClient()
  
  // Fetch all completed/delivered jobs for this driver
  const { data: jobs, error } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Cost_Driver_Total, Job_Status, Customer_Name')
    .eq('Driver_ID', session.driverId)
    .in('Job_Status', ['Completed', 'Delivered'])
    .order('Plan_Date', { ascending: false })

  const totalEarnings = jobs?.reduce((sum, j) => sum + (j.Cost_Driver_Total || 0), 0) || 0
  const totalJobs = jobs?.length || 0

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader 
        title="สรุปรายได้" 
        leftElement={
          <Link href="/mobile/profile">
            <ChevronLeft className="text-white" />
          </Link>
        } 
      />

      <div className="space-y-6">
        {/* Total Summary Card */}
        <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Banknote size={120} className="text-white transform rotate-12" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-blue-100 text-sm mb-1">รายได้รวมทั้งหมด</p>
            <h2 className="text-4xl font-bold text-white mb-4">
              ฿{totalEarnings.toLocaleString()}
            </h2>
            <div className="flex gap-4">
               <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-blue-100 text-[10px] uppercase">งานที่สำเร็จ</p>
                  <p className="text-white font-bold">{totalJobs} งาน</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-3">
          <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2">
            <Calendar size={14} /> ประวัติงานที่สำเร็จ
          </h3>
          
          {totalJobs === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <p>ไม่พบประวัติงานที่สำเร็จ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs?.map((job) => (
                <Card key={job.Job_ID} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">{job.Customer_Name || job.Job_ID}</p>
                      <p className="text-slate-500 text-[10px]">
                        {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold">+฿{job.Cost_Driver_Total?.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        สำเร็จ
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
