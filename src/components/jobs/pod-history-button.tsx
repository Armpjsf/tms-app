'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generatePodPdf } from '@/components/tracking/pod-download'
import { getPublicJobDetails } from '@/lib/actions/tracking-actions'

interface PODHistoryButtonProps {
  jobId: string
  className?: string
}

/**
 * Compact per-row POD PDF download for the job history list. Fetches the full
 * job details on demand, then reuses the shared POD generator so the output is
 * identical to the public tracking page.
 */
export function PODHistoryButton({ jobId, className }: PODHistoryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    const id = toast.loading('กำลังสร้างใบ POD...')
    try {
      const details = await getPublicJobDetails(jobId)
      if (!details) {
        toast.dismiss(id)
        toast.error('ไม่พบข้อมูลงานสำหรับสร้างใบ POD')
        return
      }
      await generatePodPdf(details)
      toast.dismiss(id)
      toast.success('ดาวน์โหลดใบ POD เรียบร้อยแล้ว')
    } catch {
      toast.dismiss(id)
      toast.error('ไม่สามารถสร้างไฟล์ PDF ได้')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isGenerating}
      title="ดาวน์โหลดใบ POD (PDF)"
      aria-label="ดาวน์โหลดใบ POD (PDF)"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl',
        'bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-md',
        'text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50',
        className
      )}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">POD</span>
        </>
      )}
    </button>
  )
}
