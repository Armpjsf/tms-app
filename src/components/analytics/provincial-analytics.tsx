"use client"

import { motion } from "framer-motion"
import { MapPin, TrendingUp, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const provinceData = [
    { name: "กรุงเทพมหานคร (BKK)", range: "1,204 KM", percentage: 42, color: "bg-emerald-500" },
    { name: "ชลบุรี (Chonburi)", range: "845 KM", percentage: 28, color: "bg-blue-500" },
    { name: "ระยอง (Rayong)", range: "412 KM", percentage: 15, color: "bg-amber-500" },
    { name: "สมุทรปราการ", range: "210 KM", percentage: 10, color: "bg-purple-500" },
    { name: "อื่นๆ", range: "105 KM", percentage: 5, color: "bg-gray-400" },
]

export function ZoneAnalytics({ data = [] }: { data?: { name: string; range: string; percentage: number; color: string }[] }) {
    const zoneData = data.length > 0 ? data : [
        { name: "No data available", range: "0 KM", percentage: 0, color: "bg-gray-400" },
    ]
    return (
        <Card className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden group">
            <CardHeader className="p-8 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <MapPin className="text-emerald-500" />
                        Zone Mileage
                    </CardTitle>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        <TrendingUp size={12} />
                        Active tracking
                    </div>
                </div>
                <p className="text-gray-500 font-bold text-xs mt-1">สรุปการวิ่งรถแยกตามโซน (Zone Compliance Reporting)</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                {zoneData.map((item, idx) => (
                    <motion.div 
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-black text-gray-900">{item.name}</span>
                            <span className="font-bold text-gray-700">{item.range}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percentage}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className={cn("h-full rounded-full", item.color)}
                            />
                        </div>
                    </motion.div>
                ))}
                
                <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-wide">
                        Data integrated with Zone Mapping to verify regional border crossings.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function cn(...inputs: (string | undefined | null | boolean)[]) {
    return inputs.filter(Boolean).join(' ')
}
