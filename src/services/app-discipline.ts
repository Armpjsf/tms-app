import { createAdminClient } from '@/utils/supabase/server'

export interface AppDisciplineMetrics {
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  realtimeFlowRate: number // 0-100%
  zeroHangingRate: number // 0-100%
  proofCompletenessRate: number // 0-100%
  hangingJobsCount: number
  bulkCompletionCount: number
  totalEvaluatedJobs: number
  feedback: string[]
}

/**
 * Calculates the App & ePOD Discipline Score for a driver over a specified time window.
 */
export async function calculateDriverAppDiscipline(
  driverId: string,
  daysLookback = 30
): Promise<AppDisciplineMetrics> {
  const supabase = createAdminClient()
  const sinceDate = new Date(Date.now() - daysLookback * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

  // 1. Fetch driver jobs in the period
  const { data: jobs } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Delivery_Date, Job_Status, Photo_Proof_Url, Signature_Url, Receiver_Name, created_at, updated_at')
    .eq('Driver_ID', driverId)
    .gte('Plan_Date', sinceDate)
    .order('Plan_Date', { ascending: false })

  const allJobs = jobs || []
  const totalEvaluated = allJobs.length

  if (totalEvaluated === 0) {
    return {
      score: 100,
      grade: 'A',
      realtimeFlowRate: 100,
      zeroHangingRate: 100,
      proofCompletenessRate: 100,
      hangingJobsCount: 0,
      bulkCompletionCount: 0,
      totalEvaluatedJobs: 0,
      feedback: ['ยังไม่มีประวัติงานในรอบประเมิน']
    }
  }

  // 2. Metric A: Hanging / Unclosed Jobs from past days
  const hangingJobs = allJobs.filter(j => {
    const isPastDate = j.Plan_Date && j.Plan_Date < todayStr
    const isNotFinished = !['Completed', 'Delivered', 'Verified', 'Billed', 'Paid', 'Cancelled', 'Rejected'].includes(j.Job_Status || '')
    return isPastDate && isNotFinished
  })
  const hangingJobsCount = hangingJobs.length
  // Each hanging job deducts 15% from the zero hanging rate
  const zeroHangingRate = Math.max(0, Math.round(100 - hangingJobsCount * 15))

  // 3. Metric B: Proof Completeness (Photo Proof & Signature for delivered jobs)
  const completedJobs = allJobs.filter(j => ['Completed', 'Delivered', 'Verified', 'Billed', 'Paid'].includes(j.Job_Status || ''))
  let proofCompleteCount = 0

  for (const j of completedJobs) {
    const hasPhoto = !!j.Photo_Proof_Url && String(j.Photo_Proof_Url).trim().length > 5
    const hasSigOrReceiver = !!j.Signature_Url || (!!j.Receiver_Name && String(j.Receiver_Name).trim().length > 2)
    if (hasPhoto || hasSigOrReceiver) {
      proofCompleteCount++
    }
  }
  const proofCompletenessRate = completedJobs.length > 0 
    ? Math.round((proofCompleteCount / completedJobs.length) * 100) 
    : 100

  // 4. Metric C: Real-time Step-by-Step Flow vs Bulk Completion
  // Detect if jobs updated timestamps are clustered within < 2 minutes of each other on the same day
  let bulkCompletionCount = 0
  const completionTimestamps: number[] = []

  for (const j of completedJobs) {
    if (j.updated_at) {
      completionTimestamps.push(new Date(j.updated_at).getTime())
    }
  }
  completionTimestamps.sort((a, b) => a - b)

  for (let i = 1; i < completionTimestamps.length; i++) {
    const diffMs = completionTimestamps[i] - completionTimestamps[i - 1]
    // Less than 2 minutes (120,000 ms) between distinct jobs being closed
    if (diffMs > 0 && diffMs < 120000) {
      bulkCompletionCount++
    }
  }

  const realtimeFlowRate = completedJobs.length > 0
    ? Math.max(0, Math.round(100 - (bulkCompletionCount / completedJobs.length) * 100))
    : 100

  // 5. Composite Score Calculation
  // Weighting: Real-time Flow (35%), Zero Hanging (35%), Proof Completeness (30%)
  const rawScore = (realtimeFlowRate * 0.35) + (zeroHangingRate * 0.35) + (proofCompletenessRate * 0.30)
  const score = Math.round(Math.min(Math.max(rawScore, 0), 100))

  let grade: AppDisciplineMetrics['grade'] = 'F'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 50) grade = 'D'

  // Construct Feedback
  const feedback: string[] = []
  if (realtimeFlowRate >= 90) feedback.push('✅ อัปเดตสถานะงานตามจุดจริงได้อย่างยอดเยี่ยม')
  else if (bulkCompletionCount > 0) feedback.push(`⚠️ มีการกดปิดงานรวดเดียว ${bulkCompletionCount} ครั้ง ควรกดอัปเดตสถานะตอนถึงจุดจริง`)

  if (hangingJobsCount === 0) feedback.push('✅ ปิดงานครบวันต่อวัน ไม่มีงานค้างในระบบ')
  else feedback.push(`⚠️ มีงานค้างส่งในระบบ ${hangingJobsCount} รายการ กรุณาตรวจสอบและกดปิดงาน`)

  if (proofCompletenessRate >= 90) feedback.push('✅ แนบรูปถ่ายสินค้าและลายเซ็นครบถ้วน')
  else feedback.push(`⚠️ ขาดรูปถ่ายหรือลายเซ็น ePOD บางรายการ (${100 - proofCompletenessRate}%)`)

  return {
    score,
    grade,
    realtimeFlowRate,
    zeroHangingRate,
    proofCompletenessRate,
    hangingJobsCount,
    bulkCompletionCount,
    totalEvaluatedJobs: totalEvaluated,
    feedback
  }
}
