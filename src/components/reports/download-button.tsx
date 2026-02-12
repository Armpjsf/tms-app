"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { getReportData } from "@/app/reports/actions"

interface DownloadButtonProps {
  reportType: string
  fileName: string
}

export function DownloadButton({ reportType, fileName }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const data = await getReportData(reportType)
      if (!data || data.length === 0) {
        alert("ไม่พบข้อมูลสำหรับรายงานนี้")
        return
      }

      // Convert to CSV
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','), // Header row
        ...data.map((row: any) => headers.map(header => {
          const value = row[header]
          // Handle null, undefined, and strings with commas/quotes
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0,10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error(e)
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
    </Button>
  )
}
