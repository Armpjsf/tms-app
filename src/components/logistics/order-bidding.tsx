"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Activity, Clock, MapPin, ArrowRight, Truck, Database, ChevronDown, CheckCircle2 } from "lucide-react"
import { Job } from "@/lib/supabase/jobs"
import { getBidsForJob, acceptBid, JobBid } from "@/lib/actions/marketplace-actions"
import { toast } from "sonner"
import { useLanguage } from "@/components/providers/language-provider"

interface OrderBiddingProps {
    orders?: Job[]
}

export function OrderBidding({ orders = [] }: OrderBiddingProps) {
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
    const [bidsByJob, setBidsByJob] = useState<Record<string, JobBid[]>>({})
    const [loadingBids, setLoadingBids] = useState<Record<string, boolean>>({})
    const [processingBid, setProcessingBid] = useState<string | null>(null)

    // Derived states
    // In admin view, we want to see unassigned jobs that have potential bids
    const displayOrders = orders

    const toggleExpand = async (jobId: string) => {
        if (expandedJobId === jobId) {
            setExpandedJobId(null)
            return
        }

        setExpandedJobId(jobId)
        
        // Fetch bids if not already fetched
        if (!bidsByJob[jobId]) {
            setLoadingBids(prev => ({ ...prev, [jobId]: true }))
            const bids = await getBidsForJob(jobId)
            setBidsByJob(prev => ({ ...prev, [jobId]: bids }))
            setLoadingBids(prev => ({ ...prev, [jobId]: false }))
        }
    }

    const handleAcceptBid = async (job: Job, bid: JobBid) => {
        if (!confirm(`ยืนยันให้รถคุณ ${bid.driver_name} รับงานนี้ในราคา ฿${bid.bid_amount.toLocaleString()}?`)) return

        setProcessingBid(bid.bid_id)
        const result = await acceptBid(job.Job_ID, bid.bid_id, bid.driver_id, bid.driver_name, bid.bid_amount)
        setProcessingBid(null)
        
        if (result.success) {
            toast.success(result.message)
            // It will refetch through Next.js revalidatePath, but locally we can just close it
            setExpandedJobId(null)
        } else {
            toast.error(result.message)
        }
    }

    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="flex flex-col">
                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                            <Activity className="text-emerald-500" />
                            {t('logistics.marketplace')}
                        </CardTitle>
                        <p className="text-lg font-bold text-gray-500 font-bold tracking-wide mt-1">
                            {t('logistics.driver_bids')}: ตรวจสอบและคัดเลือกข้อเสนอจากคนขับ
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3 py-1">
                    {displayOrders.length} {t('logistics.unassigned_jobs')}
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {displayOrders.length > 0 ? (
                    displayOrders.map((order, idx) => (
                        <motion.div
                            key={order.Job_ID}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                <CardContent className="p-0">
                                    <div 
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between gap-6"
                                        onClick={() => toggleExpand(order.Job_ID)}
                                    >
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold font-black text-emerald-500 uppercase tracking-widest">{order.Job_ID}</span>
                                                <div className="flex items-center gap-1 text-orange-500 font-bold text-lg font-bold">
                                                    <Clock size={14} /> รอเสนอราคา
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="text-lg font-bold text-gray-900 leading-tight">
                                                    {order.Route_Name || 'ไม่ระบุเส้นทาง'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-gray-700 text-xl font-medium bg-gray-100/50 p-2 rounded-lg inline-flex">
                                                    <MapPin size={14} className="text-emerald-500" />
                                                    {order.Origin_Location}
                                                    <ArrowRight size={12} className="text-gray-400" />
                                                    {order.Dest_Location}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-gray-500 text-lg font-bold font-bold">
                                                    <Truck size={14} /> {order.Vehicle_Type || 'ไม่ระบุ'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:flex-col md:justify-center md:items-end md:w-48 gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 pl-0 md:pl-6">
                                            <div className="text-left md:text-right">
                                                <p className="text-base font-bold uppercase tracking-wider text-gray-500 font-bold mb-1">
                                                    {t('logistics.base_price')}
                                                </p>
                                                <p className="text-lg font-black text-gray-900">
                                                    ฿{(order.Cost_Driver_Total || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <button 
                                                className={`h-10 px-4 rounded-xl font-bold text-lg font-bold gap-2 border border-gray-200 hover:bg-gray-100 flex items-center ${expandedJobId === order.Job_ID ? 'bg-gray-100' : ''}`}
                                            >
                                                ดูราคาเสนอ <ChevronDown size={14} className={`transition-transform ${expandedJobId === order.Job_ID ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedJobId === order.Job_ID && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-gray-50 border-t border-gray-100"
                                            >
                                                <div className="p-6">
                                                    <h5 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Database size={16} className="text-emerald-500" />
                                                        {t('logistics.driver_bids')}
                                                    </h5>
                                                    
                                                    {loadingBids[order.Job_ID] ? (
                                                        <div className="text-center py-8 text-gray-400 text-xl flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                            กำลังโหลดข้อมูล...
                                                        </div>
                                                    ) : !bidsByJob[order.Job_ID] || bidsByJob[order.Job_ID].length === 0 ? (
                                                        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                                                            <p className="text-gray-500 font-medium">ยังไม่มีคนขับเสนอราคาสำหรับงานนี้</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {bidsByJob[order.Job_ID].map(bid => (
                                                                <div key={bid.bid_id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-emerald-200">
                                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                                                                            {bid.driver_name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900">{bid.driver_name}</p>
                                                                            <p className="text-lg font-bold text-gray-500">เสนอเมื่อ {new Date(bid.created_at).toLocaleString('th-TH')}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 bg-gray-50 px-4 py-2 rounded-lg">
                                                                        <div className="text-right">
                                                                            <p className="text-base font-bold uppercase font-bold text-gray-500">ราคาที่เสนอ</p>
                                                                            <p className="text-lg font-black text-emerald-600">฿{bid.bid_amount.toLocaleString()}</p>
                                                                        </div>
                                                                        <Button 
                                                                            onClick={(e) => { e.stopPropagation(); handleAcceptBid(order, bid); }}
                                                                            disabled={processingBid === bid.bid_id}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 px-6"
                                                                        >
                                                                            {processingBid === bid.bid_id ? 'กำลังดำเนินการ...' : (
                                                                                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> {t('logistics.accept_bid')}</span>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center"
                    >
                        <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-4">
                            <Activity className="text-gray-400 w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">ไม่มีงานอยู่ระหว่างการประมูล</h4>
                        <p className="text-xl text-gray-500">งานที่เปิดให้ประมูลและรอการตอบรับจะแสดงที่นี่</p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

