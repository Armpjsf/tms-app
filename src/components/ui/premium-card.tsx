"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PremiumCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  glass?: boolean
  glow?: boolean
}

export function PremiumCard({ 
  children, 
  className, 
  glass = true,
  glow = true,
  ...props 
}: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-[2.5rem] border border-gray-100 p-6 overflow-hidden relative",
        glass ? "bg-white/80 backdrop-blur-xl" : "bg-white",
        glow ? "shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]" : "shadow-md",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {/* Subtle Gradient Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
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

export function PremiumCardTitle({ children, className, icon }: { children: React.ReactNode, className?: string, icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className={cn("text-xl font-black text-gray-900 tracking-tight", className)}>
        {children}
      </h3>
    </div>
  )
}
