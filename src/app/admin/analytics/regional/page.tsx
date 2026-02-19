export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, TrendingUp, TrendingDown, Building2, BarChart3, DollarSign, Briefcase } from "lucide-react"
import { getRegionalDeepDive } from "@/lib/supabase/analytics"
import { isSuperAdmin } from "@/lib/permissions"
import { cookies } from "next/headers"
import { MonthFilter } from "@/components/analytics/month-filter"

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `฿${(amount / 1000).toFixed(0)}K`
  return `฿${amount.toFixed(0)}`
}

export default async function RegionalAnalyticsPage() {
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-slate-900/50 border-red-500/30 max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400 text-lg font-semibold">Access Denied</p>
            <p className="text-slate-500 mt-2">This page is restricted to Super Admins only.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-4">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cookieStore = await cookies()
  const monthParam = cookieStore.get('selectedMonth')?.value
  
  let startDate: string | undefined
  let endDate: string | undefined
  
  if (monthParam && monthParam !== 'all') {
    const [year, month] = monthParam.split('-').map(Number)
    startDate = new Date(year, month - 1, 1).toISOString()
    endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
  }

  const branches = await getRegionalDeepDive(startDate, endDate)
  const maxRevenue = Math.max(...branches.map(b => b.revenue), 1)
  const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0)
  const totalJobs = branches.reduce((sum, b) => sum + b.jobsCount, 0)
  const totalProfit = branches.reduce((sum, b) => sum + b.profit, 0)

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900 border-2 hover:border-slate-500 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Regional Analytics
            </h1>
            <p className="text-slate-500 text-lg">ติดตามผลงานรายสาขา • Branch Performance Comparison</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
          <MonthFilter />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg"><Building2 size={18} className="text-indigo-400" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Active Branches</p>
                <p className="text-2xl font-bold text-white">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign size={18} className="text-emerald-400" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg"><Briefcase size={18} className="text-blue-400" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Jobs</p>
                <p className="text-2xl font-bold text-white">{totalJobs.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg"><BarChart3 size={18} className="text-amber-400" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Profit</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Table */}
      <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 shadow-2xl">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
          <CardTitle className="text-white flex items-center gap-3">
            <MapPin className="text-indigo-400" size={18} />
            <span>Branch Performance Ranking</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {branches.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">No branch data available for this period</p>
              </div>
            ) : (
              branches.map((branch, index) => {
                const revenuePercent = (branch.revenue / maxRevenue) * 100
                const profitMargin = branch.revenue > 0 ? ((branch.profit / branch.revenue) * 100) : 0
                const isGrowthPositive = branch.revenueGrowth >= 0

                return (
                  <div
                    key={branch.branchId}
                    className="relative p-5 rounded-xl border border-slate-800/50 bg-slate-900/30 hover:bg-slate-800/30 hover:border-slate-700/50 transition-all group"
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -left-2 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                        index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Branch Name */}
                      <div className="col-span-3 pl-6">
                        <h3 className="text-white font-semibold text-lg">{branch.branchName}</h3>
                        <p className="text-slate-500 text-sm">{branch.jobsCount} jobs</p>
                      </div>

                      {/* Revenue Bar */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                              style={{ width: `${revenuePercent}%` }}
                            />
                          </div>
                          <span className="text-white font-mono text-sm min-w-[80px] text-right">
                            {formatCurrency(branch.revenue)}
                          </span>
                        </div>
                      </div>

                      {/* Profit */}
                      <div className="col-span-2 text-center">
                        <p className="text-xs text-slate-500 mb-1">Profit</p>
                        <p className={`font-semibold ${branch.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(branch.profit)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {profitMargin.toFixed(1)}% margin
                        </p>
                      </div>

                      {/* Growth */}
                      <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isGrowthPositive ? (
                            <TrendingUp size={16} className="text-emerald-400" />
                          ) : (
                            <TrendingDown size={16} className="text-red-400" />
                          )}
                          <span className={`text-lg font-bold ${isGrowthPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isGrowthPositive ? '+' : ''}{branch.revenueGrowth.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          vs prev period ({formatCurrency(branch.previousRevenue)})
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
