"use client"

import { useState } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import { Calendar, MapPin, Package, StickyNote, Send, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { requestShipment } from "@/app/planning/actions"
import { toast } from "sonner"

interface RequestShipmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function RequestShipmentDialog({ open, onOpenChange }: RequestShipmentDialogProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        Plan_Date: new Date().toISOString().split('T')[0],
        Origin_Location: "",
        Dest_Location: "",
        Cargo_Type: "",
        Notes: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            const res = await requestShipment(formData)
            if (res.success) {
                setSuccess(true)
                setTimeout(() => {
                    onOpenChange(false)
                    setSuccess(false)
                    setFormData({
                        Plan_Date: new Date().toISOString().split('T')[0],
                        Origin_Location: "",
                        Dest_Location: "",
                        Cargo_Type: "",
                        Notes: ""
                    })
                }, 2000)
                toast.success(t('shipment.toast_success'))
            } else {
                toast.error(res.message)
            }
        } catch {
            toast.error(t('shipment.toast_error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[95vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border border-border/10 shadow-2xl rounded-[2.5rem]">
            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
                    >
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
                            <CheckCircle2 className="text-white w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-foreground mb-2 tracking-tighter">{t('shipment.success_title')}</h3>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-base font-bold">{t('shipment.success_desc')}</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col flex-1 overflow-hidden"
                    >
                        <DialogHeader className="p-8 pb-4 flex-shrink-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                    <Package size={20} />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">{t('shipment.title_request')}</DialogTitle>
                            </div>
                            <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-base font-bold">
                                {t('shipment.subtitle_request')}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-base font-bold font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Calendar size={14} className="text-emerald-500" /> {t('shipment.plan_date')}
                                        </Label>
                                        <Input 
                                            type="date"
                                            required
                                            value={formData.Plan_Date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Plan_Date: e.target.value }))}
                                            className="h-12 rounded-2xl bg-muted/50 border-border/10 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-base font-bold font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <MapPin size={14} className="text-emerald-500" /> {t('shipment.origin')}
                                            </Label>
                                            <Input 
                                                placeholder={t('shipment.placeholder_origin')}
                                                required
                                                value={formData.Origin_Location}
                                                onChange={(e) => setFormData(prev => ({ ...prev, Origin_Location: e.target.value }))}
                                                className="h-12 rounded-2xl bg-muted/50 border-border/10 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-base font-bold font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <MapPin size={14} className="text-amber-500" /> {t('shipment.destination')}
                                            </Label>
                                            <Input 
                                                placeholder={t('shipment.placeholder_destination')}
                                                required
                                                value={formData.Dest_Location}
                                                onChange={(e) => setFormData(prev => ({ ...prev, Dest_Location: e.target.value }))}
                                                className="h-12 rounded-2xl bg-muted/50 border-border/10 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-base font-bold font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Package size={14} className="text-blue-500" /> {t('shipment.cargo')}
                                        </Label>
                                        <Input 
                                            placeholder={t('shipment.placeholder_cargo')}
                                            required
                                            value={formData.Cargo_Type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Cargo_Type: e.target.value }))}
                                            className="h-12 rounded-2xl bg-muted/50 border-border/10 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-base font-bold font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <StickyNote size={14} className="text-purple-500" /> {t('shipment.notes')}
                                        </Label>
                                        <Textarea 
                                            placeholder={t('shipment.placeholder_notes')}
                                            rows={3}
                                            value={formData.Notes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Notes: e.target.value }))}
                                            className="rounded-2xl bg-muted/50 border-border/10 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-none"
                                        />
                                    </div>
                                </div>

                                <DialogFooter className="pt-4 border-t border-border/10">
                                    <PremiumButton 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full h-14 rounded-2xl shadow-xl shadow-emerald-500/20 text-lg group"
                                    >
                                        {loading ? t('shipment.submitting') : (
                                            <>
                                                <Send size={20} className="mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                {t('shipment.submit_btn')}
                                            </>
                                        )}
                                    </PremiumButton>
                                </DialogFooter>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}

