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
        return <div className="text-center py-10 text-slate-500">ไม่มีข้อมูลสาขา</div>
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">ชื่อสาขา (Branch)</TableHead>
                        <TableHead className="text-right text-slate-400">งาน (Jobs)</TableHead>
                        <TableHead className="text-right text-slate-400">รายรับ (Revenue)</TableHead>
                        <TableHead className="text-right text-slate-400">กำไรเบื้องต้น (Profit)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((branch) => (
                        <TableRow key={branch.branchId} className="border-slate-800 hover:bg-slate-800/30">
                            <TableCell className="font-medium text-white">{branch.branchName}</TableCell>
                            <TableCell className="text-right text-slate-300">{branch.jobsCount}</TableCell>
                            <TableCell className="text-right text-white font-semibold">{formatCurrency(branch.revenue)}</TableCell>
                            <TableCell className={`text-right font-bold ${branch.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(branch.profit)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <p className="text-[10px] text-slate-600 mt-4 italic">
                *กำไรเบื้องต้น คำนวณจาก รายรับ - ค่าขนส่ง (ไม่รวมค่าน้ำมันและค่าซ่อมบำรุง)
            </p>
        </div>
    )
}
