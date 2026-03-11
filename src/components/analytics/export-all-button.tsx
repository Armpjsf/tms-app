"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToCSV } from "@/lib/utils/export"

interface Financials {
    revenue: number;
    cost: {
        total: number;
        driver: number;
        fuel: number;
        maintenance: number;
        secondary: number;
    };
    netProfit: number;
    profitMargin: number;
}

interface StatusDistItem {
    name: string;
    value: number;
}

interface BranchPerformance {
    branchId: string;
    branchName: string;
    revenue: number;
    jobsCount: number;
    profit: number;
}

interface ExportAllButtonProps {
    data: {
        financials: Financials;
        revenueTrend: Record<string, unknown>[];
        topCustomers: Record<string, unknown>[];
        statusDist: StatusDistItem[];
        branchPerf: BranchPerformance[];
        subPerf: Record<string, unknown>[];
        [key: string]: unknown; // Allow additional modules
    }
}

export function ExportAllButton({ data }: ExportAllButtonProps) {
    const handleExportAll = () => {
        // Flatten various stats into a single report for convenience
        // In a real scenario, we might want separate sheets in an Excel file,
        // but for CSV we'll just download the most important one (Branch Performance)
        // or trigger multiple downloads.
        
        // Let's trigger a download for the most detailed operational data: Branch Performance
        exportToCSV(data.branchPerf, "executive_monthly_report_branches");
        
        // And maybe a summary one
        const summary = [{
            revenue: data.financials.revenue,
            total_cost: data.financials.cost.total,
            net_profit: data.financials.netProfit,
            margin: `${data.financials.profitMargin.toFixed(2)}%`,
            total_jobs: data.statusDist.reduce((sum: number, item: StatusDistItem) => sum + item.value, 0)
        }];
        exportToCSV(summary, "executive_monthly_report_summary");
    };

    return (
        <Button 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            onClick={handleExportAll}
        >
            <Download className="mr-2 h-4 w-4" /> Export Monthly Report
        </Button>
    );
}
