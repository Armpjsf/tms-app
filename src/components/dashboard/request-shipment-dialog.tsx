"use client"

import { useState } from "react"
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
                toast.success("ส่งคำขอเรียบร้อยแล้ว")
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการส่งคำขอ")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-[2.5rem]">
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
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tighter">ส่งคำขอสำเร็จ!</h3>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">เราได้รับข้อมูลของคุณแล้ว แอดมินจะรีบดำเนินการให้โดยเร็วที่สุด</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DialogHeader className="p-8 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                        <Package size={20} />
                                    </div>
                                    <DialogTitle className="text-2xl font-black tracking-tighter">ขอกดคิวงานใหม่</DialogTitle>
                                </div>
                                <DialogDescription className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                    Request New Shipment
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <Calendar size={14} className="text-emerald-500" /> วันที่ต้องการให้รถเข้า
                                        </Label>
                                        <Input 
                                            type="date"
                                            required
                                            value={formData.Plan_Date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Plan_Date: e.target.value }))}
                                            className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                <MapPin size={14} className="text-emerald-500" /> สถานที่รับของ
                                            </Label>
                                            <Input 
                                                placeholder="เช่น นวนคร"
                                                required
                                                value={formData.Origin_Location}
                                                onChange={(e) => setFormData(prev => ({ ...prev, Origin_Location: e.target.value }))}
                                                className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                <MapPin size={14} className="text-amber-500" /> สถานที่ส่งของ
                                            </Label>
                                            <Input 
                                                placeholder="เช่น สมุทรปราการ"
                                                required
                                                value={formData.Dest_Location}
                                                onChange={(e) => setFormData(prev => ({ ...prev, Dest_Location: e.target.value }))}
                                                className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <Package size={14} className="text-blue-500" /> ประเภทสินค้า / น้ำหนัก
                                        </Label>
                                        <Input 
                                            placeholder="เช่น สินค้าอุปโภค (2 ตัน)"
                                            required
                                            value={formData.Cargo_Type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Cargo_Type: e.target.value }))}
                                            className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <StickyNote size={14} className="text-purple-500" /> หมายเหตุเพิ่มเติม
                                        </Label>
                                        <Textarea 
                                            placeholder="ระบุเบอร์โทรติดต่อ หรือรายละเอียดอื่นๆ"
                                            rows={3}
                                            value={formData.Notes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, Notes: e.target.value }))}
                                            className="rounded-2xl bg-gray-50/50 border-gray-100 font-bold focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-none"
                                        />
                                    </div>
                                </div>

                                <DialogFooter className="pt-4 border-t border-gray-50">
                                    <PremiumButton 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full h-14 rounded-2xl shadow-xl shadow-emerald-500/20 text-lg group"
                                    >
                                        {loading ? "กำลังส่งข้อมูล..." : (
                                            <>
                                                <Send size={20} className="mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                ยืนยันการส่งคำขอ
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
