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
          <Card key={sector.title} className="bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-200 transition-all group relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-slate-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:text-gray-900 transition-colors">
                  <Icon size={20} />
                </div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">{sector.title}</CardTitle>
              </div>
            {sector.metrics.every(m => m.status === 'good') ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {sector.metrics.map((m) => (
                  <div key={m.label} className="p-3 bg-white/90 rounded-xl border border-gray-200">
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-tighter mb-1">{m.label}</p>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(m.status)}`} />
                       <span className="text-xl font-black text-gray-950 leading-none">{m.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href={sector.href}>
                <Button variant="ghost" className="w-full justify-between text-xs font-black text-gray-700 hover:text-white hover:bg-slate-900 group/btn border border-gray-100">
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
