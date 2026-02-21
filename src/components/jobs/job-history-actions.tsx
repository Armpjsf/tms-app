"use client"

import { useState } from "react"
import { ExternalLink, Image, Banknote, FileText, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JobDialog } from "@/components/planning/job-dialog"
import { PODDialog } from "@/components/jobs/pod-dialog"
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
  const [viewPod, setViewPod] = useState(false)
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

  // Identify Reports
  const pickupPhotos = job.Pickup_Photo_Url ? job.Pickup_Photo_Url.split(',') : []
  const podPhotos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',') : []

  const pickupReport = pickupPhotos.find(url => url.includes('_PICKUP_REPORT.jpg'))
  const podReport = podPhotos.find(url => url.includes('_REPORT.jpg'))

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 1. Job Details Dialog */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="ดูรายละเอียด/แก้ไข"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      {/* 2. View All POD Images */}
      {job.Photo_Proof_Url && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10"
            onClick={() => setViewPod(true)}
            title="ดูรูปทั้งหมด"
          >
            <Image className="h-4 w-4" aria-hidden="true" />
          </Button>
      )}

      {/* 3. Dedicated POD Report View */}
      {podReport && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10"
            onClick={() => window.open(podReport, '_blank')}
            title="ดูใบงาน (POD)"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
          </Button>
      )}

      {/* 4. Dedicated Pickup Report View */}
      {pickupReport && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => window.open(pickupReport, '_blank')}
            title="ดูใบงาน (Pickup)"
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
          </Button>
      )}

      {/* 5. Sync to Accounting */}
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

      <PODDialog 
        open={viewPod} 
        onOpenChange={setViewPod} 
        job={job} 
      />
    </div>
  )
}
