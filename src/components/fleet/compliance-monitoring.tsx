"use client"

import { motion } from "framer-motion"
import { ShieldCheck, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const complianceData = [
    { name: "Vehicle Registration (ภาษีรถ)", status: "expiredSoon", date: "2024-03-15", daysLeft: 12 },
    { name: "Driver Licenses (ใบขับขี่)", status: "valid", date: "2025-11-20", daysLeft: 600 },
    { name: "Vehicle Insurance (ประกันภัย)", status: "valid", date: "2024-08-10", daysLeft: 154 },
    { name: "Medical Certificates", status: "expiring", date: "2024-03-25", daysLeft: 22 },
]

export function FleetCompliance({ data = [] }: { data?: any[] }) {
    const complianceData = data.length > 0 ? data : [
        { name: "No records found", status: "valid", date: "-", daysLeft: 0 },
    ]
    return (
        <Card className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl overflow-hidden group">
            <CardHeader className="p-8 border-b border-gray-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-blue-600" />
                        Fleet Compliance
                    </CardTitle>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        Risk Monitoring
                    </div>
                </div>
                <p className="text-gray-500 font-bold text-xs mt-1">การติดตามใบอนุญาตและเอกสารสำคัญ (Executive Risk View)</p>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-1 gap-4">
                    {complianceData.map((item, idx) => (
                        <motion.div 
                            key={item.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-300"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${
                                    item.status === 'expiredSoon' ? 'bg-red-50 text-red-600' :
                                    item.status === 'expiring' ? 'bg-amber-50 text-amber-600' :
                                    'bg-emerald-50 text-emerald-600'
                                }`}>
                                    {item.status === 'expiredSoon' ? <AlertCircle size={18} /> : 
                                     item.status === 'expiring' ? <Clock size={18} /> : 
                                     <CheckCircle2 size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 leading-tight">{item.name}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Expires: {item.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-black ${
                                    item.status === 'expiredSoon' ? 'text-red-600' :
                                    item.status === 'expiring' ? 'text-amber-600' :
                                    'text-emerald-600'
                                }`}>
                                    {item.daysLeft} DAYS
                                </p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Remaining</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
