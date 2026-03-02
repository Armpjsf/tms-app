import { createClient } from "@/utils/supabase/server"
import { isSuperAdmin } from "@/lib/permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare, Star, User, ExternalLink } from "lucide-react"
import { PremiumCard } from "@/components/ui/premium-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function CustomerFeedbackPage() {
  const supabase = await createClient()
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h1 className="text-3xl font-black text-red-500">ACCESS DENIED</h1>
        <Link href="/dashboard"><Button className="rounded-2xl font-bold">Back to Dashboard</Button></Link>
      </div>
    )
  }

  // 1. Fetch feedback records first
  const { data: feedback, error: fetchError } = await supabase
    .from('job_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (fetchError) {
    console.error("Error fetching feedback:", fetchError.message || fetchError)
  }

  const baseFeedback = feedback || []
  const jobIds = [...new Set(baseFeedback.map(f => f.job_id).filter(Boolean))]

  // 2. Fetch related job details manually (to avoid schema join errors)
  let jobsMap: Record<string, any> = {}
  if (jobIds.length > 0) {
    const { data: jobsData } = await supabase
      .from('Jobs_Main')
      .select('Job_ID, Customer_Name, Driver_Name')
      .in('Job_ID', jobIds)
    
    if (jobsData) {
        jobsMap = jobsData.reduce((acc: any, job: any) => ({
            ...acc,
            [job.Job_ID]: job
        }), {})
    }
  }

  // 3. Combine data
  const feedbackData = baseFeedback.map(f => ({
    ...f,
    Jobs_Main: jobsMap[f.job_id] || null
  }))

  const totalFeedback = feedbackData.length
  const averageRating = totalFeedback > 0 
    ? (feedbackData.reduce((acc: number, f: any) => acc + (f.rating || 0), 0) / totalFeedback).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-6">
        <Link href="/admin/analytics">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <MessageSquare className="text-indigo-500" size={32} />
            Customer Feedback
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Voices of the Customer • Quality Monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Simple Stats Card */}
          <PremiumCard className="p-6">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Total Feedback</p>
              <h2 className="text-3xl font-black text-gray-900">{totalFeedback}</h2>
          </PremiumCard>
          <PremiumCard className="p-6">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Average Satisfaction</p>
              <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-black text-gray-900">
                    {averageRating}
                  </h2>
                  <Star className="fill-amber-400 text-amber-400" size={24} />
              </div>
          </PremiumCard>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {feedbackData.map((item: any) => (
              <PremiumCard key={item.id} className="p-6 transition-all hover:border-indigo-500/30 group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                              <div className="flex">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                      <Star 
                                        key={s} 
                                        size={14} 
                                        className={cn(s <= (item.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200")} 
                                      />
                                  ))}
                              </div>
                              <Badge className="bg-slate-900 text-[9px] uppercase font-black">{item.job_id}</Badge>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">
                                {new Date(item.created_at).toLocaleDateString('th-TH')}
                              </span>
                          </div>
                          
                          <p className="text-gray-900 font-bold text-lg leading-relaxed">
                              &quot;{item.comment || 'ไม่มีความเห็นเพิ่มเติม'}&quot;
                          </p>

                          <div className="flex flex-wrap gap-4 pt-2">
                              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase">
                                  <User size={12} className="text-indigo-500" />
                                  <span>Customer: {item.Jobs_Main?.Customer_Name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase">
                                  <User size={12} className="text-emerald-500" />
                                  <span>Driver: {item.Jobs_Main?.Driver_Name || 'N/A'}</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center">
                        <Link href={`/track/${item.job_id}`}>
                            <Button variant="ghost" size="sm" className="rounded-xl font-bold gap-2 text-indigo-600 hover:bg-indigo-50">
                                <span>View Job</span>
                                <ExternalLink size={14} />
                            </Button>
                        </Link>
                      </div>
                  </div>
              </PremiumCard>
          ))}
          
          {totalFeedback === 0 && (
              <div className="p-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-black">ยังไม่มีฟีดแบ็คจากลูกค้า</p>
                  {fetchError && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl max-w-md mx-auto">
                        <p className="text-red-500 font-bold text-xs">DATABASE ERROR</p>
                        <p className="text-red-400 text-[10px] mt-1 font-mono">{fetchError.message}</p>
                        <p className="text-gray-500 text-[10px] mt-2 font-bold italic">Please ensure the &apos;job_feedback&apos; table exists in Supabase.</p>
                    </div>
                  )}
              </div>
          )}
      </div>
    </div>
  )
}
