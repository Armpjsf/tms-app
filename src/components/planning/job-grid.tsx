"use client"

import { motion } from "framer-motion"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { RecentJobItem } from "@/components/planning/recent-job-item"
import { PremiumCard, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card"
import { Package, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"
import { PremiumButton } from "@/components/ui/premium-button"
import { JobDialog } from "@/components/planning/job-dialog"
import { useLanguage } from "@/components/providers/language-provider"

interface JobGridProps {
    jobs: Job[]
    drivers: Driver[]
    vehicles: Vehicle[]
    customers: Customer[]
    routes: Route[]
    subcontractors: Subcontractor[]
    canViewPrice: boolean
    canDelete: boolean
    view?: 'list' | 'requests'
    canCreate?: boolean
}

export function JobGrid({ 
    jobs,
    drivers,
    vehicles,
    customers,
    routes,
    subcontractors,
    canViewPrice,
    canDelete,
    view = 'list',
    canCreate = true
}: JobGridProps) {
    const { t } = useLanguage()
    
    return (
        <PremiumCard dark={true} className="p-0 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.1)] border-none rounded-br-[5rem] rounded-tl-[3rem]">
            <PremiumCardHeader className="p-8 border-b border-slate-50 bg-slate-950 relative overflow-hidden flex flex-row items-center justify-between">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                <PremiumCardTitle icon={<Package className="text-emerald-400" />} className="text-white relative z-10 flex-1">
                   {view === 'requests' ? t('jobs.head_requests') : t('jobs.head_live_feed')}
                </PremiumCardTitle>
                <Link href="/jobs/history" className="relative z-10">
                    <PremiumButton variant="ghost" size="sm" className="text-base tracking-[0.2em] text-slate-400 hover:text-white hover:bg-white/5">
                        ARCHIVE DATA <ArrowRight className="w-5 h-5 ml-2" />
                    </PremiumButton>
                </Link>
            </PremiumCardHeader>
                
                {jobs.length === 0 ? (
                    <div className="text-center py-20 bg-background/20">
                        <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-inner">
                            <Package className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-xl text-gray-500 font-bold mb-6">
                            {view === 'requests' ? "ไม่มีคำขอใหม่จากลูกค้า" : "ยังไม่มีงานที่วางแผนไว้สำหรับวันนี้"}
                        </p>
                        <div className="flex justify-center gap-3">
                            {view !== 'requests' && (
                                <JobDialog 
                                    drivers={drivers} 
                                    vehicles={vehicles}
                                    customers={customers}
                                    routes={routes}
                                    subcontractors={subcontractors}
                                    trigger={
                                        canCreate ? (
                                            <PremiumButton className="h-16 px-12 rounded-2xl text-lg">
                                                <Plus size={28} className="mr-2" />
                                                เริ่มแผนงานแรก
                                            </PremiumButton>
                                        ) : <></>
                                    }
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 bg-transparent">
                        {jobs.map((job) => (
                            <motion.div 
                                key={job.Job_ID}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="transition-colors"
                            >
                                <RecentJobItem 
                                    job={job}
                                    drivers={drivers}
                                    vehicles={vehicles}
                                    customers={customers}
                                    routes={routes}
                                    subcontractors={subcontractors}
                                    canViewPrice={canViewPrice}
                                    canDelete={canDelete}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
                
                {jobs.length > 0 && (
                    <div className="p-8 bg-gray-50/30 text-center border-t border-gray-50">
                        <p className="text-base font-black text-slate-500 uppercase tracking-[0.3em] mt-2 group-hover:text-slate-400 transition-colors">
                            Logistics Intelligence Engine • Today&apos;s Activity
                        </p>
                    </div>
                )}
        </PremiumCard>
    )
}
