"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Palette, ArrowLeft, Moon, Sun, Monitor } from "lucide-react"
import { useRouter } from "next/navigation"

type Theme = 'light' | 'dark' | 'system'

export default function ThemeSettingsPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme
    if (stored) {
        setTheme(stored)
    } else {
        setTheme('system')
    }
  }, [])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark')
    } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
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
          <Palette className="text-purple-400" />
          ธีมและการแสดงผล
        </h1>
        <p className="text-slate-400">ปรับแต่งหน้าตาการใช้งานตามความชอบ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
         <div 
            className={`cursor-pointer transition-all border-2 rounded-xl overflow-hidden ${theme === 'light' ? 'border-indigo-500 bg-white/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}
            onClick={() => handleThemeChange('light')}
         >
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4 text-slate-800">
                    <Sun size={32} />
                </div>
                <h3 className="text-white font-bold mb-1">โหมดสว่าง</h3>
                <p className="text-sm text-slate-400">เหมาะสำหรับการใช้งานกลางแจ้ง</p>
            </div>
         </div>

         <div 
            className={`cursor-pointer transition-all border-2 rounded-xl overflow-hidden ${theme === 'dark' ? 'border-indigo-500 bg-white/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}
            onClick={() => handleThemeChange('dark')}
         >
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-white">
                    <Moon size={32} />
                </div>
                <h3 className="text-white font-bold mb-1">โหมดมืด</h3>
                <p className="text-sm text-slate-400">สบายตา และประหยัดพลังงาน</p>
            </div>
         </div>

         <div 
            className={`cursor-pointer transition-all border-2 rounded-xl overflow-hidden ${theme === 'system' ? 'border-indigo-500 bg-white/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}
            onClick={() => handleThemeChange('system')}
         >
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4 text-slate-300">
                    <Monitor size={32} />
                </div>
                <h3 className="text-white font-bold mb-1">ตามระบบ</h3>
                <p className="text-sm text-slate-400">ปรับตามการตั้งค่าของอุปกรณ์</p>
            </div>
         </div>
      </div>
    </DashboardLayout>
  )
}
