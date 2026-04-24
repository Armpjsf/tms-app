"use client"

import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuantityStepperProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    min?: number;
    max?: number;
}

export function QuantityStepper({ 
    value, 
    onChange, 
    label = "ระบุจำนวนจริง (ชิ้น)",
    min = 0,
    max = 999999
}: QuantityStepperProps) {
    const numValue = parseFloat(value) || 0

    const handleIncrement = () => {
        const newValue = Math.min(numValue + 1, max)
        onChange(newValue.toString())
    }

    const handleDecrement = () => {
        const newValue = Math.max(numValue - 1, min)
        onChange(newValue.toString())
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
            onChange(val)
        }
    }

    return (
        <div className="glass-panel p-6 rounded-[2.5rem] border-emerald-500/20 space-y-4 bg-emerald-500/[0.03]">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">
                {label}
            </p>
            
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white active:scale-95 active:bg-slate-700 transition-all shadow-lg"
                >
                    <Minus size={24} strokeWidth={3} />
                </button>

                <div className="flex-1 relative">
                    <input
                        type="number"
                        inputMode="decimal"
                        value={value}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        placeholder="0"
                        className="w-full h-24 bg-slate-900 border-4 border-emerald-500 rounded-[2rem] text-5xl font-black text-emerald-400 text-center focus:border-emerald-400 focus:ring-8 focus:ring-emerald-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500/60 font-black text-xs uppercase tracking-[0.2em] pointer-events-none italic">
                        ชิ้น
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-16 h-16 rounded-2xl bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white active:scale-95 active:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>
            
            {/* Quick Presets for convenience */}
            <div className="flex justify-center gap-2">
                {[1, 5, 10, 50].map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => onChange((numValue + preset).toString())}
                        className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black text-emerald-500/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                    >
                        +{preset}
                    </button>
                ))}
            </div>
        </div>
    )
}
