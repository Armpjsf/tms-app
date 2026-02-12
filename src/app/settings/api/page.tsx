"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Globe, ArrowLeft, Copy, RefreshCw, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSetting, saveSetting } from "@/lib/supabase/system_settings"

export default function ApiSettingsPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState("loading...")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInfo = async () => {
      // In a real app, this should be a protected API call, not just a setting
      // But for this MVP, we simulate it or use system settings
      const key = await getSetting('api_key', 'tms_live_xxxxxxxxxxxxxxxx')
      setApiKey(key)
      setLoading(false)
    }
    loadInfo()
  }, [])

  const generateNewKey = async () => {
    if (!confirm("การสร้างคีย์ใหม่จะทำให้คีย์เดิมใช้งานไม่ได้ ยืนยันหรือไม่?")) return
    const newKey = `tms_live_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`
    setApiKey(newKey)
    await saveSetting('api_key', newKey, 'Public API Key')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    alert("คัดลอก API Key แล้ว")
  }

  if (loading) {
      return (
          <DashboardLayout>
              <div className="flex items-center justify-center h-full text-slate-400">Loading settings...</div>
          </DashboardLayout>
      )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="mr-2" size={20} />
          กลับไปตั้งค่า
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Globe className="text-emerald-400" />
          การเชื่อมต่อ API
        </h1>
        <p className="text-slate-400">จัดการ API Key สำหรับเชื่อมต่อกับระบบภายนอก</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
        <CardContent className="p-6 space-y-6">
            <div>
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <Key size={18} className="text-indigo-400" />
                    Public API Key
                </h3>
                <p className="text-sm text-slate-500 mb-4">ใช้คีย์นี้สำหรับเชื่อมต่อกับระบบ ERP หรือ Wesbite ภายนอก</p>
                
                <div className="flex gap-2">
                    <Input 
                        value={apiKey} 
                        readOnly 
                        className="bg-slate-950 font-mono text-slate-300 border-slate-700"
                    />
                    <Button variant="outline" onClick={copyToClipboard}>
                        <Copy size={16} />
                    </Button>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
                <Button 
                    variant="outline" 
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={generateNewKey}
                >
                    <RefreshCw className="mr-2" size={16} />
                    สร้าง API Key ใหม่
                </Button>
                <p className="text-xs text-red-500/70 mt-2">
                    * การสร้างคีย์ใหม่จะทำให้แอพพลิเคชันที่ใช้คีย์เดิมหยุดทำงานทันที
                </p>
            </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
