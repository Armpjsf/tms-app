"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { 
  DollarSign, 
  Clock, 
  MapPin, 
  ArrowRight,
  Truck,
  Trophy,
  Activity
} from "lucide-react"


import { Job } from "@/lib/supabase/jobs"
import { toast } from "sonner"
import { Search } from "lucide-react"

interface BidOrder {
    id: string
    route: string
    origin: string
    destination: string
    basePrice: number
    currentBid: number
    timeLeft: string
    capacityNeeded: string
    distance: string
}

interface OrderBiddingProps {
    orders?: Job[]
}

export function OrderBidding({ orders = [] }: OrderBiddingProps) {
    // Transform Supabase Job[] to BidOrder[] if needed
    const displayOrders = orders.map(job => ({
        id: job.Job_ID,
        route: job.Route_Name || "Undefined Route",
        origin: job.Origin_Location || "Unknown",
        destination: job.Dest_Location || "Unknown",
        basePrice: job.Price_Cust_Total || 0,
        currentBid: job.Cost_Driver_Total || 0,
        timeLeft: "Active",
        capacityNeeded: job.Weight_Kg ? `${job.Weight_Kg} kg` : "N/A",
        distance: "Calculating..."
    }))

    const handlePlaceBid = (orderId: string) => {
        toast.success(`เสนอราคาสำหรับ ${orderId} สำเร็จ!`, {
            description: "ระบบกำลังส่งข้อมูลราคาของคุณไปยังผู้ประสานงาน",
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="flex flex-col">
                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                            <Activity className="text-emerald-500" />
                            Live Logistics Marketplace
                        </CardTitle>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Bidding System: ยื่นข้อเสนอราคาเพื่อรับงานที่ยังไม่มีผู้รับผิดชอบ (Unassigned Jobs)
                        </p>
                    </div>
                    <p className="text-gray-800 font-bold">Opportunities for your fleet right now</p>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3 py-1 uppercase tracking-tighter text-[10px]">
                    {displayOrders.length} New Orders
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {displayOrders.length > 0 ? (
                    displayOrders.map((order, idx) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl hover:border-emerald-500/30 transition-all duration-300 group">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{order.id}</span>
                                                <div className="flex items-center gap-1 text-orange-500 font-black text-[10px] uppercase">
                                                    <Clock size={12} />
                                                    {order.timeLeft}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="text-lg font-black text-gray-900 leading-tight">
                                                    {order.route}
                                                </h4>
                                                <div className="flex items-center gap-2 text-gray-800 font-bold">
                                                    <MapPin size={12} />
                                                    {order.origin}
                                                    <ArrowRight size={10} />
                                                    {order.destination}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-[10px] font-bold">
                                                    <Truck size={12} />
                                                    {order.capacityNeeded}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-[10px] font-bold">
                                                    <Trophy size={12} />
                                                    {order.distance}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:w-32 lg:w-36 flex-shrink-0 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10 p-4 flex flex-col justify-center items-center text-center group-hover:bg-emerald-500/10 transition-colors">
                                            <div className="mb-3">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Price</p>
                                                <p className="text-xl lg:text-2xl font-black text-gray-900 leading-none">
                                                    ฿{order.currentBid.toLocaleString()}
                                                </p>
                                            </div>
                                            <Button 
                                                onClick={() => handlePlaceBid(order.id)}
                                                className="w-full h-9 lg:h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs"
                                            >
                                                Place Bid
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-500/5 border-2 border-dashed border-emerald-500/20 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
                            <Search className="text-emerald-500 w-8 h-8 opacity-40" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900">ขณะนี้ยังไม่มีงานใหม่ใน Marketplace</h4>
                            <p className="text-sm text-gray-600 font-medium">ระบบจะแสดงงานที่ยังไม่มีผู้รับผิดชอบที่นี่เมื่อมีโอกาสใหม่ๆ สำหรับคุณ</p>
                        </div>
                    </motion.div>
                )}
            </div>

            
            <Button variant="ghost" className="w-full text-gray-700 font-black text-xs uppercase hover:bg-black/5 rounded-2xl py-6 tracking-widest">
                View All Opportunities
            </Button>
        </div>
    )
}
