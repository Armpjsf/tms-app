import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock } from "lucide-react"
import Link from "next/link"
import { getDriverJobs } from "@/lib/supabase/jobs"

import { MobileJobFilter } from "@/components/mobile/job-filter"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DriverJobsPage(props: Props) {
  const searchParams = await props.searchParams
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const date = (searchParams.date as string) || undefined
  const status = (searchParams.status as string) || undefined

  // Fetch jobs for this driver with filters
  const jobs = await getDriverJobs(session.driverId, { startDate: date, endDate: date, status })

  return (
    <div className="min-h-screen bg-background pb-24 pt-16 px-4">
      <MobileHeader title="งานของฉัน" rightElement={<MobileJobFilter />} />
      
      <div className="space-y-4">
        {jobs.length === 0 ? (
           <div className="text-center py-20 text-gray-400">
             <p>ไม่มีงานสำหรับวันนี้</p>
           </div>
        ) : jobs.map((job) => (
          <Link href={`/mobile/jobs/${job.Job_ID}`} key={job.Job_ID}>
            <Card className="bg-white/80 border-gray-200 backdrop-blur-sm active:scale-[0.98] transition-all shadow-xl rounded-2xl hover:border-emerald-500/15">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        {job.Job_ID.slice(-4)}
                     </div>
                     <div>
                       <h3 className="text-gray-800 font-medium text-sm line-clamp-1">{job.Customer_Name}</h3>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                         job.Job_Status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                         job.Job_Status === 'In Progress' ? 'bg-emerald-500/15 text-emerald-500' :
                         'bg-slate-700 text-gray-500'
                       }`}>
                         {job.Job_Status}
                       </span>
                     </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500 border-t border-gray-200 pt-3">
                   <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-orange-400" />
                      <span>{job.Route_Name}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Clock size={12} className="text-emerald-500" />
                      <span>{job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH') : "-"}</span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
