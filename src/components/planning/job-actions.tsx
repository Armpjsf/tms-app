"use client"

import { Button } from "@/components/ui/button"
import { deleteJob } from "@/app/planning/actions"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { JobDialog } from "./job-dialog"

export function JobActions({ job, drivers, vehicles }: { job: Record<string, unknown>, drivers: Record<string, unknown>[], vehicles: Record<string, unknown>[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const handleDelete = async () => {
    if (!confirm('ยืนยันการลบงานนี้?')) return
    
    setLoading(true)
    try {
      await deleteJob(job.Job_ID)
      router.refresh()
    } catch {
      toast.error('ลบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <JobDialog 
        mode="edit" 
        job={job} 
        drivers={drivers}
        vehicles={vehicles}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-emerald-500/15 text-emerald-500"
        onClick={() => setShowEdit(true)}
      >
        <Pencil size={16} />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-red-500/20 text-red-400"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
