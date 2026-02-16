"use client"

import { useState, useEffect } from "react"

import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { LogOut, Globe, Bell, Shield, Smartphone } from "lucide-react"

export default function MobileSettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [language, setLanguage] = useState("th")

  useEffect(() => {
    // Load settings from local storage
    const savedNotif = localStorage.getItem("settings_notifications")
    const savedLang = localStorage.getItem("settings_language")
    
    if (savedNotif !== null) setNotificationsEnabled(savedNotif === "true")
    if (savedLang) setLanguage(savedLang)
  }, [])

  const toggleNotifications = (checked: boolean) => {
    setNotificationsEnabled(checked)
    localStorage.setItem("settings_notifications", checked.toString())
  }

  const toggleLanguage = () => {
    const newLang = language === "th" ? "en" : "th"
    setLanguage(newLang)
    localStorage.setItem("settings_language", newLang)
    // Optional: Reload or just show state change. For now state change is fine.
    // window.location.reload() // if we had real i18n
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="ตั้งค่า" showBack />
      
      <div className="space-y-6">
        <div className="space-y-4">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider ml-1">ทั่วไป</h3>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-0 divide-y divide-slate-800">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <Bell className="text-slate-400" size={20} />
                            <span className="text-slate-200">การแจ้งเตือน</span>
                        </div>
                        <Switch 
                            checked={notificationsEnabled}
                            onCheckedChange={toggleNotifications}
                        />
                    </div>
                    <div 
                        className="flex items-center justify-between p-4 active:bg-slate-800/50 cursor-pointer"
                        onClick={toggleLanguage}
                    >
                        <div className="flex items-center gap-3">
                            <Globe className="text-slate-400" size={20} />
                            <span className="text-slate-200">เปลี่ยนภาษา</span>
                        </div>
                        <span className="text-slate-500 text-sm font-medium uppercase">{language === "th" ? "ไทย" : "English"}</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-4">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider ml-1">ข้อมูล & ความปลอดภัย</h3>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-0 divide-y divide-slate-800">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <Shield className="text-slate-400" size={20} />
                            <span className="text-slate-200">นโยบายความเป็นส่วนตัว</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-slate-400" size={20} />
                            <span className="text-slate-200">เวอร์ชันแอปพลิเคชัน</span>
                        </div>
                        <span className="text-slate-500 text-sm">v1.0.26</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="mt-8">
            <form action={async () => {
                const { logoutDriver } = await import("@/lib/actions/auth-actions")
                await logoutDriver()
            }}>
                <Button type="submit" variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-12">
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
                </Button>
            </form>
        </div>
      </div>
    </div>
  )
}
