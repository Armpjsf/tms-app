"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, ArrowLeft, Download, FileJson } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function BackupSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleBackup = async (table: string) => {
    setLoading(true)
    try {
        const { data, error } = await supabase.from(table).select('*')
        
        if (error) throw error

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${table}_backup_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (error) {
        alert("Backup failed: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
        setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="mr-2" size={20} />
          กลับไปตั้งค่า
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Database className="text-blue-400" />
          สำรองข้อมูล
        </h1>
        <p className="text-slate-400">ดาวน์โหลดข้อมูลสำรองในรูปแบบ JSON</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
            { label: "Jobs Data", table: "Jobs_Main", desc: "ข้อมูลงานขนส่งทั้งหมด" },
            { label: "Drivers Data", table: "Master_Drivers", desc: "ข้อมูลคนขับและประวัติ" },
            { label: "Vehicles Data", table: "master_vehicles", desc: "ข้อมูลยานพาหนะ" },
            { label: "Fuel Logs", table: "Fuel_Logs", desc: "บันทึกการเติมน้ำมัน" },
            { label: "Maintenance", table: "Repair_Tickets", desc: "ประวัติการซ่อมบำรุง" },
            { label: "Customers", table: "Master_Customers", desc: "ฐานข้อมูลลูกค้า" },
        ].map((item) => (
            <Card key={item.table} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <FileJson className="text-blue-400" size={24} />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.label}</h3>
                    <p className="text-sm text-slate-500 mb-4">{item.desc}</p>
                    <Button 
                        variant="outline" 
                        className="w-full gap-2" 
                        onClick={() => handleBackup(item.table)}
                        disabled={loading}
                    >
                        <Download size={16} />
                        Download JSON
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
