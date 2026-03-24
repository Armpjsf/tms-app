"use client"

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { verifyJob } from "@/lib/actions/job-actions"
import { toast } from "sonner"
import { Job } from "@/lib/supabase/jobs"

interface AdminVerificationDialogProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminVerificationDialog({ job, open, onOpenChange }: AdminVerificationDialogProps) {
  const [note, setNote] = useState(job.Verification_Note || '')
  const [loading, setLoading] = useState(false)

  async function handleVerify(status: 'Verified' | 'Rejected') {
    setLoading(true)
    try {
      const result = await verifyJob(job.Job_ID, status, note)
      if (result.success) {
        toast.success(`Job ${status === 'Verified' ? 'Approved' : 'Rejected'} successfully`)
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-slate-950 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckCircle2 size={24} />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">Report Validation</DialogTitle>
            </div>
            <DialogDescription className="text-emerald-300 font-medium tracking-tight">
              Reviewing Job ID: <span className="text-white font-black underline decoration-emerald-500/50 underline-offset-4">{job.Job_ID}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest ml-1">Internal Verification Note</label>
            <Textarea 
              placeholder="Enter reasons for rejection or approval notes..."
              className="min-h-[120px] rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all text-xl font-medium p-4 resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
                variant="outline"
                disabled={loading}
                onClick={() => handleVerify('Rejected')}
                className="h-14 rounded-2xl border-red-100 text-red-500 font-black hover:bg-red-50 hover:text-red-600 transition-all gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                REJECT
            </Button>
            <Button 
                disabled={loading}
                onClick={() => handleVerify('Verified')}
                className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 transition-all gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                APPROVE
            </Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-4 text-base font-bold font-black text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-emerald-600" /> This will be logged permanently for audit
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

