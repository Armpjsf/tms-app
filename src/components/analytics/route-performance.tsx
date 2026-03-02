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
    <div className="rounded-xl border border-gray-200 bg-white/80 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/80">
          <TableRow className="border-gray-200 hover:bg-transparent">
            <TableHead className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">เส้นทาง (Route)</TableHead>
            <TableHead className="text-gray-500 font-bold uppercase tracking-wider text-[10px] text-center">จำนวนงาน</TableHead>
            <TableHead className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">รายรับ</TableHead>
            <TableHead className="text-gray-500 font-bold uppercase tracking-wider text-[10px] text-right">Margin (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.route} className="border-gray-200 hover:bg-gray-50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-md">
                    <MapPin size={12} className="text-emerald-600" />
                  </div>
                  <span className="font-bold text-gray-800">{item.route}</span>
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
