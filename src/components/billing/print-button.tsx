"use client"

import { Printer } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrintButtonProps {
    className?: string;
    label?: string;
}

export function PrintButton({ className, label = "พิมพ์ / บันทึก PDF" }: PrintButtonProps) {
    return (
        <button 
            onClick={() => window.print()}
            className={cn(
                "h-10 px-5 bg-white border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm",
                className
            )}
        >
            <Printer size={16} /> {label}
        </button>
    )
}
