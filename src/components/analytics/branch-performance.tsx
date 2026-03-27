"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type BranchPerformanceItem = {
    branchId: string;
    branchName: string;
    revenue: number;
    jobsCount: number;
    profit: number;
}

export function BranchPerformance({ data }: { data: BranchPerformanceItem[] }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
    }

    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-400">ไม่มีข้อมูลสาขา</div>
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-border/5 hover:bg-transparent bg-muted/30">
                        <TableHead className="text-muted-foreground font-black uppercase text-base">ชื่อสาขา (Branch)</TableHead>
                        <TableHead className="text-right text-muted-foreground font-black uppercase text-base">งาน (Jobs)</TableHead>
                        <TableHead className="text-right text-muted-foreground font-black uppercase text-base">รายรับ (Revenue)</TableHead>
                        <TableHead className="text-right text-muted-foreground font-black uppercase text-base">กำไรเบื้องต้น (Profit)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((branch) => (
                        <TableRow key={branch.branchId} className="border-border/5 hover:bg-white/5 group transition-colors">
                            <TableCell className="font-bold text-foreground group-hover:text-primary transition-colors">{branch.branchName}</TableCell>
                            <TableCell className="text-right text-muted-foreground font-bold">{branch.jobsCount}</TableCell>
                            <TableCell className="text-right text-foreground font-black italic">{formatCurrency(branch.revenue)}</TableCell>
                            <TableCell className={`text-right font-black italic ${branch.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCurrency(branch.profit)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <p className="text-base font-bold text-muted-foreground mt-4 italic">
                *กำไรเบื้องต้น คำนวณจาก รายรับ - ค่าขนส่ง (ไม่รวมค่าน้ำมันและค่าซ่อมบำรุง)
            </p>
        </div>
    )
}

