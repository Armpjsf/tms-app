"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface DataSectionProps {
    title: string
    icon?: ReactNode
    headerAction?: ReactNode
    children: ReactNode
    noPadding?: boolean
}

export function DataSection({ title, icon, headerAction, children, noPadding }: DataSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm overflow-hidden shadow-2xl rounded-[2rem]">
                <CardContent className="p-0">
                    <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-primary rounded-full" />
                            {icon && (
                                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                    {icon}
                                </div>
                            )}
                            <h2 className="text-lg font-black text-foreground tracking-tight">{title}</h2>
                        </div>
                        {headerAction}
                    </div>
                    <div className={noPadding ? "" : "p-6"}>
                        {children}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
