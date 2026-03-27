"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MapPin, TrendingUp, TrendingDown } from "lucide-react"

type RouteStats = {
  route: string
  revenue: number
  cost: number
  count: number
  margin: number
}

export function RoutePerformance({ data }: { data: RouteStats[] }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="rounded-xl border border-border/10 bg-muted/40 overflow-hidden shadow-2xl">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="border-border/5 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-black uppercase text-base italic">เส้นทาง (Route)</TableHead>
            <TableHead className="text-muted-foreground font-black uppercase text-base italic text-center">จำนวนงาน</TableHead>
            <TableHead className="text-muted-foreground font-black uppercase text-base italic">รายรับ</TableHead>
            <TableHead className="text-muted-foreground font-black uppercase text-base italic text-right">Margin (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.route} className="border-border/5 hover:bg-white/5 transition-colors group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/20">
                    <MapPin size={14} className="text-emerald-400" />
                  </div>
                  <span className="font-black text-foreground italic uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{item.route}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-gray-100 border-gray-200 text-gray-700 font-mono">
                  {item.count}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-700 font-medium">
                {formatCurrency(item.revenue)}
              </TableCell>
              <TableCell className="text-right">
                <div className={`flex items-center justify-end gap-1 font-black ${item.margin >= 15 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {item.margin >= 15 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {item.margin.toFixed(1)}%
                </div>
              </TableCell>
            </TableRow>
          ))}
          
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-gray-400 italic">
                ไม่มีข้อมูลเส้นทางในช่วงเวลานี้
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

