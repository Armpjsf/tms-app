"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatItem {
    label: string
    value: string | number
    icon: ReactNode
    color: "indigo" | "amber" | "blue" | "emerald" | "red" | "purple" | "cyan" | "pink"
}

interface StatsGridProps {
    stats: StatItem[]
    columns?: number
}

const colorMap = {
    indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20" },
    blue:    { bg: "bg-blue-500/10",     text: "text-blue-400",    border: "border-blue-500/20" },
    emerald: { bg: "bg-emerald-500/10",  text: "text-emerald-400", border: "border-emerald-500/20" },
    red:     { bg: "bg-red-500/10",      text: "text-red-400",     border: "border-red-500/20" },
    purple:  { bg: "bg-purple-500/10",   text: "text-purple-400",  border: "border-purple-500/20" },
    cyan:    { bg: "bg-cyan-500/10",     text: "text-cyan-400",    border: "border-cyan-500/20" },
    pink:    { bg: "bg-pink-500/10",     text: "text-pink-400",    border: "border-pink-500/20" },
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
    const gridCols = {
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-2 lg:grid-cols-4",
        5: "md:grid-cols-3 lg:grid-cols-5",
        6: "md:grid-cols-3 lg:grid-cols-6",
    }[columns] || "md:grid-cols-4"

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`grid grid-cols-2 ${gridCols} gap-4 mb-8`}
        >
            {stats.map((stat, idx) => {
                const colors = colorMap[stat.color]
                return (
                    <Card
                        key={idx}
                        className={`bg-slate-900/60 ${colors.border} backdrop-blur-md hover:border-slate-700/50 transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden group`}
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                            <div className="w-24 h-24">{stat.icon}</div>
                        </div>
                        <CardContent className="p-5">
                            <div className={`p-2.5 ${colors.bg} rounded-xl w-fit mb-3`}>
                                <div className={`w-5 h-5 ${colors.text} flex items-center justify-center`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className={`text-3xl font-black ${colors.text} tracking-tighter mb-0.5`}>
                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                            </p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                {stat.label}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </motion.div>
    )
}
