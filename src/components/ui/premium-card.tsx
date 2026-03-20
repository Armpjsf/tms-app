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
            ? "glass-panel bg-white/5 border-white/5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]" 
            : "bg-white border-gray-200",
        asymmetric && "rounded-tr-[5rem] rounded-bl-[5rem] rounded-tl-2xl rounded-br-2xl",
        glow ? "hover:shadow-[0_40px_80px_-15px_rgba(255,30,133,0.15)]" : "shadow-md",
        "transition-all duration-500",
        className
      )}
      {...props}
    >
      {/* Premium Gradient Ring Overlay */}
      <div className="absolute inset-0 p-[1px] rounded-[inherit] bg-gradient-to-br from-white/10 via-transparent to-primary/10 -z-10 pointer-events-none" />
      
      {/* Global Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[0.5px]" />
      
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
        <div className="p-2.5 bg-primary/15 rounded-xl text-primary shadow-inner border border-primary/10">
          {icon}
        </div>
      )}
      <h3 className={cn(
        "text-xl font-black tracking-tight", 
        dark ? "text-slate-100" : "text-white",
        className
      )}>
        {children}
      </h3>
    </div>
  )
}
