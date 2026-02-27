"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface PageHeaderProps {
    icon: ReactNode
    title: string
    subtitle?: string
    badge?: ReactNode
    actions?: ReactNode
}

export function PageHeader({ icon, title, subtitle, badge, actions }: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-slate-900/40 p-6 lg:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl mb-8 relative overflow-hidden"
        >
            {/* Decorative background icon */}
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none scale-150">
                {icon}
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2.5 bg-primary/20 rounded-2xl shadow-lg shadow-primary/20 flex-shrink-0">
                        <div className="text-primary w-7 h-7 flex items-center justify-center">
                            {icon}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-muted-foreground font-medium mt-1">{subtitle}</p>
                        )}
                    </div>
                    {badge && <div className="ml-2">{badge}</div>}
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap gap-3 relative z-10">
                    {actions}
                </div>
            )}
        </motion.div>
    )
}
