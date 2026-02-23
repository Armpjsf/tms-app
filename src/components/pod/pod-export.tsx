"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToCSV } from "@/lib/utils/export"
import { PODRecord } from "@/lib/supabase/pod"

interface PODExportProps {
  data: PODRecord[]
}

export function PODExport({ data }: PODExportProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return

    const exportData = data.map(pod => ({
      'Job ID': pod.Job_ID,
      'วันที่': pod.Plan_Date ? new Date(pod.Plan_Date).toLocaleDateString('th-TH') : '-',
      'ลูกค้า': pod.Customer_Name || '-',
      'คนขับ': pod.Driver_Name || '-',
      'ทะเบียนรถ': pod.Vehicle_Plate || '-',
      'เส้นทาง': pod.Route_Name || '-',
      'สถานะ': pod.Job_Status,
      'เวลาส่งจริง': pod.Actual_Delivery_Time || '-',
      'รูปถ่าย': pod.Photo_Proof_Url ? 'มี' : 'ไม่มี',
      'ลายเซ็น': pod.Signature_Url ? 'มี' : 'ไม่มี'
    }))

    exportToCSV(exportData, `POD_Report_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <Button size="lg" className="gap-2" onClick={handleExport}>
      <Download size={20} />
      ดาวน์โหลดรายงาน
    </Button>
  )
}
