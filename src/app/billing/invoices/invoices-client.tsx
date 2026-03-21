"use client"

import React from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Search, 
  Download,
  MoreHorizontal,
  FileCheck,
  FileText,
  Zap,
  ShieldCheck,
  Activity
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface InvoicesClientProps {
  initialInvoices: any[]
  query: string
}

export default function InvoicesClient({ initialInvoices, query }: InvoicesClientProps) {
  const { t } = useLanguage()

  return (
    <DashboardLayout>
      {/* Tactical Invoice Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <FileText className="text-primary" size={20} />
                </div>
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">FINANCIAL PROTOCOL</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {t('invoices.title')}
            </h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              Tax compliance, automated invoicing & fiscal documentation vault
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <Link href="/billing/invoices/create">
            <PremiumButton className="h-20 px-12 rounded-[2rem] shadow-[0_20px_40px_rgba(255,30,133,0.3)] text-xl font-black tracking-widest group">
                <Plus size={24} className="mr-4 group-hover:rotate-90 transition-transform duration-500" strokeWidth={3} />
                NEW INVOICE
            </PremiumButton>
          </Link>
        </div>
      </div>

      {/* Registry Intelligence Filters */}
      <div className="glass-panel border-white/5 rounded-[3rem] p-10 mb-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <div className="flex items-end justify-between gap-8 relative z-10">
            <div className="flex-1 max-w-2xl space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Search Invoice Matrix</Label>
              <div className="relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover/search:text-primary transition-colors duration-300" size={20} />
                <Input
                    placeholder="SCAN BY INVOICE ID, ENTITY OR FISCAL CODE..."
                    className="w-full h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl pl-16 pr-6 uppercase tracking-widest text-sm focus:bg-white/10 transition-all border-2 focus:border-primary/30"
                    defaultValue={query}
                />
              </div>
            </div>
            
            <PremiumButton variant="outline" className="h-16 px-10 rounded-2xl border-white/5 bg-white/5 gap-4">
                <Activity className="w-5 h-5" />
                <span className="font-black uppercase tracking-widest text-[10px]">EXECUTE RECONCILIATION</span>
            </PremiumButton>
          </div>
      </div>

      {/* Invoice Registry */}
      <div className="glass-panel rounded-[4rem] border-white/5 shadow-2xl overflow-hidden bg-[#0a0518]/20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-12 gap-8 relative z-10">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase premium-text-gradient">Tax Compliance Ledger</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Official Fiscal Node Repository</p>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="px-5 py-2 rounded-full bg-white/5 border border-white/5 text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  REAL-TIME SYNC ACTIVE
              </div>
          </div>
        </div>

        <div className="relative w-full overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-12 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Invoice Identity</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Commercial Entity</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Issue Vector</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Settlement Due</th>
                  <th className="px-8 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-right">Net Value</th>
                  <th className="px-12 py-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Protocol Status</th>
                  <th className="px-12 py-10 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {initialInvoices.length === 0 ? (
                    <tr>
                        <td colSpan={7} className="text-center py-40">
                          <div className="flex flex-col items-center gap-6 opacity-30">
                             <div className="p-8 bg-white/5 rounded-full border-2 border-white/5 animate-pulse">
                                <FileText size={64} className="text-slate-500" strokeWidth={1} />
                             </div>
                             <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-xs">Zero Fiscal Records Detected</p>
                          </div>
                        </td>
                    </tr>
                ) : (
                    initialInvoices.map((inv: Record<string, any>) => (
                      <tr key={inv.Invoice_ID} className="group/row hover:bg-primary/[0.03] transition-all duration-500">
                        <td className="px-12 py-10">
                            <div className="flex flex-col gap-1">
                                <span className="font-black text-white text-xl tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase">{inv.Invoice_ID}</span>
                                {inv.Tax_Invoice_ID && (
                                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">FISCAL: {inv.Tax_Invoice_ID}</span>
                                )}
                            </div>
                        </td>
                        <td className="px-8 py-10">
                           <div className="flex flex-col gap-1">
                               <span className="font-black text-slate-300 text-sm uppercase tracking-tight">{inv.Customer_Name}</span>
                               <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest italic group-hover/row:text-slate-500">Verified Corporate Account</span>
                           </div>
                        </td>
                        <td className="px-8 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            {inv.Issue_Date ? new Date(inv.Issue_Date).toLocaleDateString(t('common.document_index') === 'ดัชนีเอกสาร' ? 'th-TH' : 'en-US') : '-'}
                        </td>
                        <td className="px-8 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            {inv.Due_Date ? new Date(inv.Due_Date).toLocaleDateString(t('common.document_index') === 'ดัชนีเอกสาร' ? 'th-TH' : 'en-US') : '-'}
                        </td>
                        <td className="px-8 py-10 text-right">
                             <div className="flex flex-col items-end">
                                <span className="text-2xl font-black text-white tracking-tighter group-hover/row:text-primary transition-colors bg-white/5 px-5 py-2 rounded-2xl">฿{Number(inv.Grand_Total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-2">Net Settlement</span>
                            </div>
                        </td>
                        <td className="px-12 py-10 text-center">
                            <div className={cn(
                                "inline-flex items-center gap-2.5 px-6 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest border transition-all duration-500 group-hover/row:scale-110",
                                inv.Status === 'Paid' 
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                                    : inv.Status === 'Overdue'
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                                    : "bg-primary/10 text-primary border-primary/20 shadow-[0_0_20px_rgba(255,30,133,0.1)]"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]", 
                                    inv.Status === 'Paid' ? "bg-emerald-500" : inv.Status === 'Overdue' ? "bg-rose-500 animate-ping" : "bg-primary animate-pulse"
                                )} />
                                {inv.Status}
                            </div>
                        </td>
                        <td className="px-12 py-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-12 w-12 p-0 rounded-2xl hover:bg-white/10 text-slate-500 hover:text-white transition-all">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#0c061d] border-white/10 text-white min-w-[200px] p-2 rounded-2xl shadow-2xl ring-1 ring-white/10">
                              <DropdownMenuLabel className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-4 py-3">Vector Command</DropdownMenuLabel>
                              <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors">
                                <FileCheck className="h-4 w-4 text-primary" /> 
                                <span className="text-[10px] font-black uppercase tracking-widest">Audit Analytics</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors" asChild>
                                <Link href={`/billing/print/${inv.Invoice_ID}`} target="_blank" className="flex items-center">
                                  <Download className="h-4 w-4 text-primary" /> 
                                  <span className="text-[10px] font-black uppercase tracking-widest">{t('invoices.print')}</span>
                                </Link>
                              </DropdownMenuItem>
                              <div className="h-px bg-white/5 my-2 mx-2" />
                              <DropdownMenuItem className="focus:bg-rose-500/20 focus:text-rose-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors">
                                <Zap className="h-4 w-4" /> 
                                <span className="text-[10px] font-black uppercase tracking-widest">Abort Record</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">Invoice Engine Cluster v4.0</p>
                <div className="h-4 w-px bg-white/5" />
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">ENCRYPTED VAULT</span>
                </div>
            </div>
            <ShieldCheck size={18} className="text-primary opacity-20" />
        </div>
      </div>

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-[9px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <Zap size={14} className="text-primary" /> LogisPro Fiscal Engine • Matrix Synchronization v4.2
        </div>
      </div>
    </DashboardLayout>
  )
}
