"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, Users, Activity, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterProps {
    allCustomers: any[]
    initialCustomers: string[]
    initialStart: string
    initialEnd: string
}

export function ProfitReportFilters({ allCustomers, initialCustomers, initialStart, initialEnd }: FilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [startDate, setStartDate] = useState(initialStart)
    const [endDate, setEndDate] = useState(initialEnd)
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>(initialCustomers)
    const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    const handleSync = () => {
        setIsSyncing(true)
        const params = new URLSearchParams(searchParams.toString())
        if (startDate) params.set('start', startDate)
        else params.delete('start')
        
        if (endDate) params.set('end', endDate)
        else params.delete('end')

        if (selectedCustomers.length > 0) params.set('customers', selectedCustomers.join(','))
        else params.delete('customers')
        
        router.push(`/reports/cost-per-trip?${params.toString()}`)
        setTimeout(() => setIsSyncing(false), 1000)
    }

    const toggleCustomer = (name: string) => {
        setSelectedCustomers(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        )
    }

    const handleReset = () => {
        setStartDate("")
        setEndDate("")
        setSelectedCustomers([])
        router.push(`/reports/cost-per-trip`)
    }

    return (
        <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/[0.02] backdrop-blur-3xl p-4 rounded-3xl border border-slate-200 shadow-xl mb-8 relative z-50">
             <div className="flex flex-wrap items-center gap-3 relative z-10 w-full">
                <div className="relative">
                    <button 
                        onClick={() => setIsCustomerMenuOpen(!isCustomerMenuOpen)}
                        className={cn(
                            "h-11 px-4 bg-white border border-slate-200 rounded-xl flex items-center gap-2 hover:border-violet-300 transition-all text-xs font-black uppercase tracking-widest",
                            selectedCustomers.length > 0 && "border-violet-500 text-violet-600 shadow-lg shadow-violet-500/10"
                        )}
                    >
                        <Users size={16} />
                        {selectedCustomers.length > 0 ? `${selectedCustomers.length} เลือกแล้ว` : "เลือกตามลูกค้า"}
                    </button>

                    {isCustomerMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCustomerMenuOpen(false)} />
                            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-5 animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">เลือกรายชื่อลูกค้า</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                                    {allCustomers.map(c => (
                                        <button 
                                            key={c.Customer_ID}
                                            onClick={() => toggleCustomer(c.Customer_Name)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-violet-50 group transition-all text-left",
                                                selectedCustomers.includes(c.Customer_Name) ? "bg-violet-100/50" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", selectedCustomers.includes(c.Customer_Name) ? "bg-violet-500" : "bg-slate-200")} />
                                                <span className={cn(
                                                    "text-[11px] font-bold uppercase truncate max-w-[180px]",
                                                    selectedCustomers.includes(c.Customer_Name) ? "text-violet-700" : "text-slate-600"
                                                )}>{c.Customer_Name}</span>
                                            </div>
                                            {selectedCustomers.includes(c.Customer_Name) && <Check size={14} className="text-violet-600" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={handleSync}
                                        className="w-full h-10 bg-violet-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20"
                                    >
                                        ตกลง
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-3 h-11 hover:border-violet-300 transition-all">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic whitespace-nowrap">เริ่ม:</span>
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-xs font-black uppercase text-slate-900 w-full cursor-pointer"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-3 h-11 hover:border-violet-300 transition-all">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic whitespace-nowrap">สิ้นสุด:</span>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-xs font-black uppercase text-slate-900 w-full cursor-pointer"
                    />
                </div>
                
                {(startDate || endDate || selectedCustomers.length > 0) && (
                    <button 
                        onClick={handleReset}
                        className="p-2.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        title="Reset Range"
                    >
                        <X size={18} />
                    </button>
                )}
                
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={cn(
                        "px-6 h-11 bg-violet-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-violet-700 transition-all flex items-center gap-2 shadow-xl shadow-violet-500/20 ml-auto",
                        isSyncing && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Activity size={14} strokeWidth={3} />
                    {isSyncing ? "กำลังประมวลผล..." : "แสดงผล"}
                </button>
            </div>
        </div>
    )
}
