"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Bell, ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSetting, saveSetting } from "@/lib/supabase/system_settings"

interface NotificationSettings {
  push_enabled: boolean
  email_enabled: boolean
  sos_alert_enabled: boolean
  daily_report_email: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  push_enabled: true,
  email_enabled: true,
  sos_alert_enabled: true,
  daily_report_email: false,
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSetting('notification_settings', DEFAULT_SETTINGS)
      setSettings(data)
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await saveSetting('notification_settings', settings, 'Admin Notification Preferences')
    setSaving(false)
    alert("บันทึกการตั้งค่าเรียบร้อยแล้ว")
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="mr-2" size={20} />
          กลับไปตั้งค่า
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Bell className="text-yellow-400" />
          การแจ้งเตือน
        </h1>
        <p className="text-slate-400">จัดการการรับข่าวสารและการเตือนภัย</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-white font-medium">Push Notifications</h3>
              <p className="text-sm text-slate-500">รับการแจ้งเตือนบนเบราว์เซอร์และมือถือ</p>
            </div>
            <Switch 
              checked={settings.push_enabled}
              onCheckedChange={(checked) => setSettings({...settings, push_enabled: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-white font-medium">Email Notifications</h3>
              <p className="text-sm text-slate-500">รับข่าวสารทั่วไปทางอีเมล</p>
            </div>
            <Switch 
              checked={settings.email_enabled}
              onCheckedChange={(checked) => setSettings({...settings, email_enabled: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-white font-medium">SOS Alert</h3>
              <p className="text-sm text-slate-500">แจ้งเตือนทันทีเมื่อคนขับกดปุ่ม SOS (สำคัญ)</p>
            </div>
            <Switch 
              checked={settings.sos_alert_enabled}
              onCheckedChange={(checked) => setSettings({...settings, sos_alert_enabled: checked})}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="space-y-0.5">
              <h3 className="text-white font-medium">Daily Report Email</h3>
              <p className="text-sm text-slate-500">รับสรุปรายงานประจำวันทางอีเมลทุกเช้า (08:00 น.)</p>
            </div>
            <Switch 
              checked={settings.daily_report_email}
              onCheckedChange={(checked) => setSettings({...settings, daily_report_email: checked})}
            />
          </div>

          <div className="pt-6">
            <Button onClick={handleSave} disabled={loading || saving} className="w-full bg-indigo-600 hover:bg-indigo-500">
              {saving ? "กำลังบันทึก..." : (
                  <>
                    <Save className="mr-2" size={18} /> บันทึกการเปลี่ยนแปลง
                  </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
