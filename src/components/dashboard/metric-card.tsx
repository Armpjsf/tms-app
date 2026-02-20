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
    primary: "from-indigo-500 to-blue-600",
    success: "from-emerald-500 to-teal-600",
    danger: "from-red-500 to-rose-600",
    warning: "from-amber-500 to-orange-600",
    purple: "from-purple-500 to-pink-600",
  }

  const glows = {
    primary: "shadow-indigo-500/20",
    success: "shadow-emerald-500/20",
    danger: "shadow-red-500/20",
    warning: "shadow-amber-500/20",
    purple: "shadow-purple-500/20",
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className={cn(
        "relative rounded-2xl p-6 overflow-hidden",
        "bg-card text-card-foreground",
        "border border-border/50 shadow-sm",
        "transition-all duration-300",
        "hover:shadow-lg hover:border-border",
        "dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900/80",
        "dark:border-white/10 dark:hover:border-white/20 dark:hover:shadow-2xl",
        glows[gradient] // Keep glow for premium feel, it usually works ok or adds tint
      )}>
        {/* Gradient Top Border */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          gradients[gradient]
        )} />

        {/* Shimmer Effect on Hover (Dark mode only usually looks best, or specific light mode shimmer) */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br",
              gradients[gradient],
              "shadow-lg",
              glows[gradient],
              "text-white" // Icons usually look best white on bright gradients
            )}>
              {icon}
            </div>

            {trend && (
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                trend.value > 0 && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
                trend.value < 0 && "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
                trend.value === 0 && "bg-muted text-muted-foreground"
              )}>
                {trend.value > 0 && <TrendingUp size={14} />}
                {trend.value < 0 && <TrendingDown size={14} />}
                {trend.value === 0 && <Minus size={14} />}
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </div>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {title}
          </p>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            <motion.span className="text-4xl font-bold text-foreground">
              {display}
            </motion.span>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-2">
              {subtitle}
            </p>
          )}

          {/* Trend Label */}
          {trend?.label && (
            <p className="text-xs text-muted-foreground mt-2">
              {trend.label}
            </p>
          )}
        </div>

        {/* Background Decoration */}
        <div className={cn(
          "absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-10 bg-gradient-to-br",
          gradients[gradient]
        )} />
      </div>
    </motion.div>
  )
}
