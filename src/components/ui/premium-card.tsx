"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PremiumCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  glass?: boolean
  glow?: boolean
  asymmetric?: boolean
  dark?: boolean
}

export function PremiumCard({ 
  children, 
  className, 
  glass = true,
  glow = true,
  asymmetric = false,
  dark = false,
  ...props 
}: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className={cn(
        "rounded-[2.5rem] border p-6 overflow-hidden relative group",
        dark 
          ? "bg-slate-900/60 backdrop-blur-2xl border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)]"
          : glass 
            ? "bg-white/[0.85] backdrop-blur-xl border-white/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)]" 
            : "bg-white border-gray-200",
        asymmetric && "rounded-tr-[5rem] rounded-bl-[5rem] rounded-tl-2xl rounded-br-2xl",
        glow ? "hover:shadow-[0_40px_80px_-15px_rgba(16,185,129,0.12)]" : "shadow-md",
        "transition-all duration-500",
        className
      )}
      {...props}
    >
      {/* Premium Gradient Ring Overlay */}
      <div className="absolute inset-0 p-[1px] rounded-[inherit] bg-gradient-to-br from-white/60 via-transparent to-emerald-500/10 -z-10 pointer-events-none" />
      
      {/* Global Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[0.5px]" />
      
      {children}
    </motion.div>
  )
}

export function PremiumCardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("mb-6 flex items-center justify-between", className)}>
      {children}
    </div>
  )
}

export function PremiumCardTitle({ children, className, icon, dark = false }: { children: React.ReactNode, className?: string, icon?: React.ReactNode, dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-600 shadow-inner border border-emerald-500/10">
          {icon}
        </div>
      )}
      <h3 className={cn(
        "text-xl font-black tracking-tight", 
        dark ? "text-slate-100" : "text-gray-900",
        className
      )}>
        {children}
      </h3>
    </div>
  )
}
