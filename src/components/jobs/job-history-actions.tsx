"use client"

import { toast } from "sonner"
import Logger from "@/lib/utils/logger"
import { useState } from "react"
import { 
  ExternalLink, 
  Banknote, 
  FileText,
  ShieldCheck
} from "lucide-react"
import { AdminVerificationDialog } from "./admin-verification-dialog"
import { Button } from "@/components/ui/button"
import { JobDialog } from "@/components/planning/job-dialog"
import { JobSummaryDialog } from "@/components/jobs/job-summary-dialog"
import { syncJobToAccounting } from "@/app/settings/accounting/actions"
import { cn } from "@/lib/utils"


import { Job } from "@/lib/supabase/jobs"

import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"

type Props = {
  job: Job
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  canViewPrice?: boolean
  canDelete?: boolean
}

export function JobHistoryActions({ job, drivers, vehicles, customers, routes, canViewPrice = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleSyncToAccounting = async () => {
    if (!confirm(`ยืนยันการส่งข้อมูลงาน ${job.Job_ID} ไปยังระบบบัญชี?`)) return;

    setSyncing(true)
    try {
        const result = await syncJobToAccounting(job)
        if (result.success) {
            // Success
        } else {
            // Error
        }
    } catch (err) {
        Logger.error('Job delete error:', err)
        toast.error("เกิดข้อผิดพลาดในการลบ")
    } finally {
        setSyncing(false)
    }
  }

  // Status check for showing report
  const isFinished = ['Delivered', 'Completed', 'Complete', 'Picked Up', 'In Transit'].includes(job.Job_Status || '')

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 1. View Summary / Report Button - The Unified Entry Point */}
      {isFinished && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10"
            onClick={() => setShowSummary(true)}
            title="ดูสรุปงานและใบรายงาน"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
          </Button>
      )}

      {/* 2. Job Detail / Edit Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="ดูรายละเอียด/แก้ไข"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      {/* 2.5. Admin Verification Button */}
      {isFinished && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
                "h-8 w-8 p-0 hover:bg-black/5 transition-all outline-none border-none",
                job.Verification_Status === 'Verified' ? "text-emerald-500" : 
                job.Verification_Status === 'Rejected' ? "text-red-500" : "text-amber-500"
            )}
            onClick={() => setShowVerify(true)}
            title="ตรวจสอบและอนุมัติรายงาน"
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
      )}

      {/* 3. Sync to Accounting */}
      {canViewPrice && (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10"
        onClick={handleSyncToAccounting}
        disabled={syncing}
        title="ส่งเข้าบัญชี"
      >
        <Banknote className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
      </Button>
      )}

      <JobDialog
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        job={job}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        canViewPrice={canViewPrice}
        canDelete={canDelete}
      />

      <JobSummaryDialog
        open={showSummary}
        onOpenChange={setShowSummary}
        job={job}
      />

      <AdminVerificationDialog
        open={showVerify}
        onOpenChange={setShowVerify}
        job={job}
      />
    </div>
  )
}
