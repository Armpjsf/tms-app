"use client"

import { useState } from "react"
import { 
  ExternalLink, 
  Banknote, 
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { JobDialog } from "@/components/planning/job-dialog"
import { JobSummaryDialog } from "@/components/jobs/job-summary-dialog"
import { syncJobToAccounting } from "@/app/settings/accounting/actions"


import { Job } from "@/types/database"

type Props = {
  job: Job
  drivers: any[]
  vehicles: any[]
  customers: any[]
  routes: any[]
  canViewPrice?: boolean
  canDelete?: boolean
}

export function JobHistoryActions({ job, drivers, vehicles, customers, routes, canViewPrice = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleSyncToAccounting = async () => {
    if (!confirm(`ยืนยันการส่งข้อมูลงาน ${job.Job_ID} ไปยังระบบบัญชี?`)) return;

    setSyncing(true)
    try {
        const result = await syncJobToAccounting(job)
        if (result.success) {
            alert(`สำเร็จ: ${result.message}`)
        } else {
            alert(`ผิดพลาด: ${result.message}`)
        }
    } catch {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
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

      {/* 2. Job Details / Edit Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="ดูรายละเอียด/แก้ไข"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

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
    </div>
  )
}
