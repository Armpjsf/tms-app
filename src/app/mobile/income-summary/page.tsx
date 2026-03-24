import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="min-h-screen bg-background pb-24 pt-16 px-4">
      <MobileHeader 
        title="สรุปรายได้" 
      />

      <div className="space-y-6">
        {/* Total Summary Card */}
        <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Banknote size={120} className="text-white transform rotate-12" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-blue-100 text-xl mb-1">รายได้รวมทั้งหมด</p>
            <h2 className="text-4xl font-bold text-white mb-4">
              ฿{totalEarnings.toLocaleString()}
            </h2>
            <div className="flex gap-4">
               <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-blue-100 text-base font-bold uppercase">งานที่สำเร็จ</p>
                  <p className="text-white font-bold">{totalJobs} งาน</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-3">
          <h3 className="text-gray-500 font-medium text-xl flex items-center gap-2">
            <Calendar size={14} /> ประวัติงานที่สำเร็จ
          </h3>
          
          {totalJobs === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>ไม่พบประวัติงานที่สำเร็จ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs?.map((job: SummaryJob) => (
                <Card key={job.Job_ID} className="bg-white border-gray-200">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-gray-800 font-medium text-xl">{job.Customer_Name || job.Job_ID}</p>
                      <p className="text-gray-400 text-base font-bold">
                        {job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      {job.Show_Price_To_Driver !== false ? (
                        <p className="text-emerald-400 font-bold">+฿{job.Cost_Driver_Total?.toLocaleString()}</p>
                      ) : (
                        <p className="text-gray-400 font-bold">***</p>
                      )}
                      <div className="flex items-center justify-end gap-1 text-base font-bold text-gray-400">
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

