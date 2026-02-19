"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon, CheckCircle2, AlertCircle, ChevronRight, Layers, Truck, Building2 } from "lucide-react"
import Link from "next/link"

const ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers,
  truck: Truck,
  building: Building2,
}

type HealthMetric = {
  label: string
  value: string | number
  status: 'good' | 'warning' | 'critical'
}

type SectorHealth = {
  title: string
  icon: string
  href: string
  metrics: HealthMetric[]
}

export function ExecutiveSectorHealth({ sectors }: { sectors: SectorHealth[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-500'
      case 'warning': return 'bg-amber-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-slate-500'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {sectors.map((sector) => {
        const Icon = ICON_MAP[sector.icon] || Layers
        return (
          <Card key={sector.title} className="bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-slate-700 transition-all group relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-slate-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                  <Icon size={20} />
                </div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">{sector.title}</CardTitle>
              </div>
            {sector.metrics.every(m => m.status === 'good') ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-400 animate-pulse" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {sector.metrics.map((m) => (
                  <div key={m.label} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-1">{m.label}</p>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(m.status)}`} />
                       <span className="text-lg font-black text-white leading-none">{m.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href={sector.href}>
                <Button variant="ghost" className="w-full justify-between text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/50 group/btn">
                  VIEW FULL DASHBOARD
                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )})}
    </div>
  )
}
