"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, User, CloudSync, RefreshCcw, CheckCircle2, XCircle } from "lucide-react"
import { checkAccountingConnection } from "./accounting-actions"

export default function SettingsPage() {
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connected' | 'failed'>('idle')

  const handleCheckConnection = async () => {
    setChecking(true)
    const result = await checkAccountingConnection()
    setChecking(false)
    if (result.success && result.connected) {
        setStatus('connected')
    } else {
        setStatus('failed')
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Accounting Integration */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <CloudSync className="h-5 w-5 text-indigo-400" /> Accounting Integration
                </CardTitle>
                <CardDescription>Monitor your connection to Akaunting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <CloudSync className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Akaunting Cloud</p>
                            <p className="text-xs text-slate-500">Auto-sync: Enabled</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {status === 'connected' && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-400/10 px-2 py-1 rounded-full">
                                <XCircle className="h-3.5 w-3.5" /> Connection Failed
                            </div>
                        )}
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                            onClick={handleCheckConnection}
                            disabled={checking}
                        >
                            {checking ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                            Test Connection
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Invoice Sync</p>
                        <p className="text-sm font-medium text-slate-300">Just now</p>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Payout Sync</p>
                        <p className="text-sm font-medium text-slate-300">Awaiting trigger</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Profile Section */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><User className="h-5 w-5" /> Profile Info</CardTitle>
                <CardDescription>Update your admin profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-400">First Name</Label>
                        <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="Admin" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">Last Name</Label>
                        <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="User" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-400">Email</Label>
                    <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="admin@logis-pro.com" disabled />
                </div>
                <Button>Save Changes</Button>
            </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
               <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded">
                    <span>Email Alerts for New Jobs</span>
                    <input type="checkbox" className="h-5 w-5 rounded border-slate-700 bg-slate-900" defaultChecked />
               </div>
               <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded">
                    <span>SMS Alerts for SOS</span>
                    <input type="checkbox" className="h-5 w-5 rounded border-slate-700 bg-slate-900" defaultChecked />
               </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
