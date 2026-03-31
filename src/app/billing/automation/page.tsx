'use client'

import { generateMonthlyBillingNotes, sendScheduledBillingEmails } from "@/lib/supabase/billing-automation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, Zap, Send, Settings, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/components/providers/language-provider"

export default function AutomationDashboard() {
    const { t } = useLanguage()
    const [generating, setGenerating] = useState(false)
    const [sending, setSending] = useState(false)
    const [lastGenCount, setLastGenCount] = useState<number | null>(null)
    const [lastSendCount, setLastSendCount] = useState<number | null>(null)

    const handleGenerate = async () => {
        setGenerating(true)
        const toastId = toast.loading(t('automation.toast_gen_loading'))
        try {
            const result = await generateMonthlyBillingNotes()
            if (result.success) {
                setLastGenCount(result.count)
                toast.success(t('automation.toast_gen_success', { count: result.count }), { id: toastId })
            } else {
                throw new Error(result.error)
            }
        } catch (e: any) {
            toast.error(e.message || t('common.failed'), { id: toastId })
        } finally {
            setGenerating(false)
        }
    }

    const handleSend = async () => {
        setSending(true)
        const toastId = toast.loading(t('automation.toast_send_loading'))
        try {
            const result = await sendScheduledBillingEmails()
            if (result.success) {
                setLastSendCount(result.count)
                toast.success(t('automation.toast_send_success', { count: result.count }), { id: toastId })
            } else {
                throw new Error(result.error)
            }
        } catch (e: any) {
            toast.error(e.message || t('common.failed'), { id: toastId })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="p-8 space-y-6 max-w-4xl mx-auto min-h-screen animate-in fade-in duration-700">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/5 rounded-2xl">
                    <Settings className="w-8 h-8 text-primary animate-spin-slow" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('automation.title')}</h1>
                    <p className="text-muted-foreground">{t('automation.description')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Generation Control */}
                <Card className="border-2 border-primary/5 hover:border-primary/20 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-24 h-24 text-yellow-500" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Zap className="w-5 h-5 text-yellow-600" />
                            </div>
                            {t('automation.gen_title')}
                        </CardTitle>
                        <CardDescription className="pt-2">
                            {t('automation.gen_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button 
                            className="w-full h-12 text-md font-semibold bg-yellow-600 hover:bg-yellow-700"
                            onClick={handleGenerate}
                            disabled={generating}
                        >
                            {generating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
                            {t('automation.gen_btn')}
                        </Button>
                        {lastGenCount !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium animate-in slide-in-from-top-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('automation.last_run_gen', { count: lastGenCount })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dispatch Control */}
                <Card className="border-2 border-primary/5 hover:border-primary/20 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Send className="w-24 h-24 text-blue-500" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Send className="w-5 h-5 text-blue-600" />
                            </div>
                            {t('automation.send_title')}
                        </CardTitle>
                        <CardDescription className="pt-2">
                            {t('automation.send_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button 
                            className="w-full h-12 text-md font-semibold bg-blue-600 hover:bg-blue-700"
                            onClick={handleSend}
                            disabled={sending}
                        >
                            {sending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                            {t('automation.send_btn')}
                        </Button>
                        {lastSendCount !== null && (
                            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium animate-in slide-in-from-top-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {t('automation.last_run_send', { count: lastSendCount })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <AlertCircle className="w-6 h-6 text-primary mt-1" />
                        <div>
                            <h3 className="font-bold text-lg">{t('automation.setup_title')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('automation.setup_desc')}
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-background rounded-xl border border-primary/10">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t('automation.cron_example')}</p>
                            <pre className="text-xs font-mono text-primary/80 overflow-x-auto whitespace-pre">
{`{
  "crons": [
    {
      "path": "/api/automation/generate-billing?secret=\${CRON_SECRET}",
      "schedule": "0 23 28-31 * *"
    },
    {
      "path": "/api/automation/send-billing?secret=\${CRON_SECRET}",
      "schedule": "0 9 1 * *"
    }
  ]
}`}
                            </pre>
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                            {t('automation.cron_hint')}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    )
}
