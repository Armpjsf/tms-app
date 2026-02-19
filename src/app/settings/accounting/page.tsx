"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CloudSync, RefreshCcw, CheckCircle2, XCircle, ArrowLeft, Save, Loader2, Key, Building2 } from "lucide-react"
import { checkAccountingConnection, saveAccountingSettings } from "@/app/admin/settings/accounting-actions"
import { getSetting } from "@/lib/supabase/system_settings"

export default function AccountingSettingsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connected' | 'failed'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [apiKey, setApiKey] = useState("")
  const [companyId, setCompanyId] = useState("1")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      const savedKey = await getSetting('akaunting_api_key', "")
      const savedCompany = await getSetting('akaunting_company_id', "1")
      setApiKey(savedKey)
      setCompanyId(savedCompany)
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    const result = await saveAccountingSettings(apiKey, companyId)
    setSaving(false)
    if (result.success) {
      alert("บันทึกการตั้งค่าเรียบร้อยแล้ว")
      setStatus('idle') // Reset status after save to encourage re-test
    } else {
      alert("ไม่สามารถบันทึกการตั้งค่าได้: " + result.message)
    }
  }

  const handleCheckConnection = async () => {
    setChecking(true)
    setErrorMsg(null)
    const result = await checkAccountingConnection()
    setChecking(false)
    if (result.success && result.connected) {
        setStatus('connected')
    } else {
        setStatus('failed')
        setErrorMsg(result.message || "Unknown connection error")
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button 
            variant="ghost" 
            className="mb-4 pl-0 hover:bg-transparent hover:text-foreground" 
            onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2" size={20} />
          กลับไปตั้งค่า
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <CloudSync className="text-indigo-400" />
          การเชื่อมต่อระบบบัญชี (Akaunting)
        </h1>
        <p className="text-muted-foreground">จัดการการเชื่อมต่อและตรวจสอบสถานะกับ Akaunting Cloud</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Credentials Card */}
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    การตั้งค่าสิทธิ์เข้าถึง (Credentials)
                </CardTitle>
                <CardDescription>ระบุ API Key และ Company ID จากระบบ Akaunting ของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="apiKey">Akaunting API Key</Label>
                    <Input 
                        id="apiKey"
                        type="password"
                        placeholder="ป้อน API Key ของคุณที่นี่..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-muted border-border text-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground">หาได้จากหน้า User Profile &gt; API Token ใน Akaunting</p>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="companyId" className="flex items-center gap-2">
                         <Building2 className="w-4 h-4" /> Company ID
                    </Label>
                    <Input 
                        id="companyId"
                        placeholder="1"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="bg-muted border-border text-foreground max-w-[150px]"
                    />
                    <p className="text-[10px] text-muted-foreground">ปกติจะเป็น 1 หากคุณมีบริษัทเดียวในระบบ</p>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSaveSettings} 
                        disabled={saving}
                        className="gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        บันทึกการตั้งค่า
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground">สถานะการเชื่อมต่อ</CardTitle>
                <CardDescription>ตรวจสอบว่า TMS สามารถส่งข้อมูลไปยัง Akaunting ได้ปกติหรือไม่</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <CloudSync className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Akaunting Cloud</p>
                            <p className="text-xs text-muted-foreground">Auto-sync: Enabled</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {status === 'connected' && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
                                <XCircle className="h-3.5 w-3.5" /> Connection Failed
                            </div>
                        )}
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-border text-foreground hover:bg-muted"
                            onClick={handleCheckConnection}
                            disabled={checking || !apiKey}
                        >
                            {checking ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                            Test Connection
                        </Button>
                    </div>
                </div>

                {status === 'failed' && errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <p className="text-xs font-bold text-rose-500 uppercase mb-1">Error Details:</p>
                        <p className="text-sm text-rose-400 font-mono italic">{errorMsg}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Invoice Sync (Customer)</p>
                        <p className="text-sm font-medium text-foreground">ทำงานร่วมกับ Billing Note</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Bill Sync (Driver Cost)</p>
                        <p className="text-sm font-medium text-foreground">ทำงานร่วมกับ Driver Payment</p>
                    </div>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-sm text-amber-500 flex items-center gap-2">
                        💡 ข้อมูลจะถูกส่งโดยอัตโนมัติเมื่อมีการสร้างเอกสารในระบบ TMS
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
