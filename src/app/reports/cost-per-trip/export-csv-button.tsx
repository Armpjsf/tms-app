'use client'

import { FileDown, Loader2 } from "lucide-react"
import { useState } from "react"

interface ExportCSVButtonProps {
    data: any[]
}

export function ExportCSVButton({ data }: ExportCSVButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleExport = () => {
        setLoading(true)
        try {
            if (!data || data.length === 0) {
                alert("ไม่มีข้อมูลสำหรับส่งออก")
                return
            }

            // 1. Define Headers
            const headers = [
                "วันที่",
                "Job ID",
                "ทะเบียนรถ",
                "ลูกค้า",
                "เส้นทาง",
                "ระยะทาง (KM)",
                "รายได้ (THB)",
                "ค่าคนขับ (THB)",
                "ค่าน้ำมันจริง (THB)",
                "ค่าน้ำมันอ้างอิง (THB)",
                "ค่าซ่อมบำรุงจริง (THB)",
                "ค่าซ่อมบำรุงอ้างอิง (THB)",
                "ต้นทุนรวมจริง (THB)",
                "กำไร (THB)",
                "Margin (%)"
            ]

            // 2. Map Data to Rows
            const rows = data.map(t => [
                t.Plan_Date || "-",
                t.Job_ID,
                t.Vehicle_Plate || "-",
                t.Customer_Name || "-",
                t.Route_Name || "-",
                t.distance_km || 0,
                t.Cost_Customer_Total || 0,
                (t.Cost_Driver_Total || 0) + (t.extra_cost || 0),
                t.fuel_real || 0,
                t.fuel_est || 0,
                t.maint_real || 0,
                t.maint_est || 0,
                t.total_cost || 0,
                t.profit || 0,
                t.profit_pct || 0
            ])

            // 3. Convert to CSV String
            // We use \ufeff (BOM) to ensure Excel opens Thai characters correctly
            const csvContent = "\ufeff" + [
                headers.join(","),
                ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
            ].join("\n")

            // 4. Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            const fileName = `Trip_Performance_${new Date().toISOString().split('T')[0]}.csv`
            
            link.setAttribute("href", url)
            link.setAttribute("download", fileName)
            link.style.visibility = "hidden"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error("Export CSV Error:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button 
            onClick={handleExport}
            disabled={loading || !data || data.length === 0}
            className="h-11 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2 group/btn text-xs border border-slate-700"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <FileDown size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />
            )}
            Export CSV
        </button>
    )
}
