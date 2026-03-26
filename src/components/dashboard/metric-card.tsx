"use client"

import * as React from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  gradient?: "primary" | "success" | "danger" | "warning" | "purple"
  delay?: number
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient = "primary",
  delay = 0,
}: MetricCardProps) {
  const gradients = {
    primary: "from-emerald-500/20 to-teal-500/20",
    success: "from-emerald-400/20 to-emerald-600/20",
    danger: "from-rose-500/20 to-red-600/20",
    warning: "from-amber-400/20 to-orange-500/20",
    purple: "from-blue-500/20 to-indigo-600/20",
  }

  const activeGradients = {
    primary: "from-emerald-600 to-teal-700",
    success: "from-emerald-400 to-emerald-600",
    danger: "from-rose-500 to-red-600",
    warning: "from-amber-400 to-orange-500",
    purple: "from-blue-600 to-indigo-700",
  }

  const glows = {
    primary: "shadow-emerald-500/20",
    success: "shadow-emerald-400/20",
    danger: "shadow-red-500/20",
    warning: "shadow-amber-500/20",
    purple: "shadow-blue-500/20",
  }

  // Animated counter
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/,/g, '')) || 0
  const spring = useSpring(0, { duration: 2000 })
  const display = useTransform(spring, (v) => 
    typeof value === 'number' ? Math.floor(v).toLocaleString() : value
  )

  React.useEffect(() => {
    spring.set(numValue)
  }, [numValue, spring])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay 
      }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }}
      className="relative group cursor-pointer"
    >
      <div className={cn(
        "relative rounded-[2.5rem] p-8 overflow-hidden",
        "bg-white/70 backdrop-blur-xl", // Glassmorphism
        "border border-white/40 shadow-2xl",
        "transition-all duration-500",
        "hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:bg-white/90",
        glows[gradient]
      )}>
        {/* Dynamic Gradient Top Border */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-80",
          activeGradients[gradient]
        )} />

        {/* Decorative Ghost Icon Background */}
        <div className={cn(
          "absolute -bottom-10 -right-10 w-44 h-44 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none rotate-12",
          "text-gray-900"
        )}>
          {icon}
        </div>

        <div className="relative z-10">
          {/* Header Area */}
          <div className="flex items-start justify-between mb-8">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center",
              "bg-gradient-to-br",
              activeGradients[gradient],
              "shadow-2xl shadow-emerald-500/20",
              "text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
            )}>
              {React.cloneElement(icon as React.ReactElement, { size: 28 })}
            </div>

            {trend && (
              <div className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold font-black uppercase tracking-widest",
                trend.value > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {trend.value > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </div>
            )}
          </div>

          {/* Title Area */}
          <div className="space-y-1">
            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em]">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <motion.span className="text-5xl font-black text-gray-900 tracking-tighter">
                {display}
              </motion.span>
            </div>
            
            {/* Detailed Subtitle */}
            {subtitle && (
              <div className="flex items-center gap-2 mt-4">
                <div className={cn("w-1.5 h-1.5 rounded-full", "bg-" + (gradient === 'primary' || gradient === 'success' ? 'emerald' : 'rose') + "-500")} />
                <p className="text-base font-bold font-black text-gray-700 uppercase tracking-widest leading-none">
                    {subtitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Corner Accent Glow */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl blur-3xl opacity-20 pointer-events-none",
          gradients[gradient]
        )} />
      </div>
    </motion.div>
  )
}

