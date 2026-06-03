"use client"

import { useState } from "react"
import { Thermometer, Save, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { submitContainerTemp } from "@/app/mobile/jobs/actions"
import { cn } from "@/lib/utils"

type Props = {
  jobId: string
  targetTemp?: number | null
  driverName?: string | null
  onSuccess?: () => void
  onClose?: () => void
}

export function ContainerTempForm({ jobId, targetTemp, driverName, onSuccess, onClose }: Props) {
    const [temp, setTemp] = useState("")
    const [remark, setRemark] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!temp) {
            toast.error("กรุณาระบุอุณหภูมิ")
            return
        }

        setLoading(true)
        try {
            const res = await submitContainerTemp(jobId, Number(temp), driverName || 'Driver', remark)
            if (res.success) {
                toast.success("บันทึกอุณหภูมิเรียบร้อยแล้ว")
                if (onSuccess) onSuccess()
                if (onClose) onClose()
            } else {
                toast.error(res.message)
            }
        } catch (e) {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ")
        } finally {
            setLoading(false)
        }
    }

    const diff = targetTemp !== null && targetTemp !== undefined && temp !== "" 
        ? Number(temp) - targetTemp 
        : null
    
    const isWarning = diff !== null && diff > 2 // Alert if 2 degrees higher than target

    return (
        <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-4 rounded-2xl",
                        isWarning ? "bg-rose-500/20 text-rose-500" : "bg-blue-500/20 text-blue-500"
                    )}>
                        <Thermometer size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Update Temperature</h3>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Reefer Container Monitor</p>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X size={24} />
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {targetTemp !== null && targetTemp !== undefined && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                        <span className="text-sm font-black text-blue-600 uppercase tracking-widest">Target Temperature</span>
                        <span className="text-2xl font-black text-blue-600 italic">{targetTemp}°C</span>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Current Temperature (°C)</Label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            step="0.1"
                            value={temp}
                            onChange={(e) => setTemp(e.target.value)}
                            placeholder="e.g. -18.5"
                            className={cn(
                                "h-20 text-4xl font-black text-center rounded-3xl transition-all border-2",
                                isWarning ? "border-rose-500 bg-rose-500/5 text-rose-600" : "border-primary bg-primary/5 text-primary"
                            )}
                        />
                        {diff !== null && (
                            <div className={cn(
                                "absolute -top-3 -right-2 px-3 py-1 rounded-full text-xs font-black shadow-lg",
                                isWarning ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                            )}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}°C Diff
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Optional Remark</Label>
                    <Input 
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="Notes about cooling unit..."
                        className="h-14 bg-muted/50 border-border/50 rounded-2xl font-bold"
                    />
                </div>
            </div>

            <Button 
                onClick={handleSubmit}
                disabled={loading || !temp}
                className="w-full h-16 rounded-2xl text-xl font-black uppercase tracking-widest gap-3 shadow-xl"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                Confirm Update
            </Button>
        </div>
    )
}
