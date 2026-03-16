"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface PremiumButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg" | "xl"
  loading?: boolean
}

export function PremiumButton({ 
  children, 
  variant = "primary", 
  size = "md", 
  loading = false,
  className,
  disabled,
  ...props 
}: PremiumButtonProps) {
  
  const variants = {
    primary: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600",
    secondary: "bg-slate-900 text-slate-100 border border-white/10 shadow-lg shadow-black/20 hover:bg-black",
    outline: "bg-transparent border-2 border-white/10 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5",
    ghost: "bg-transparent text-slate-500 hover:bg-white/5 hover:text-slate-200",
    danger: "bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600",
  }

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    xl: "px-10 py-5 text-lg",
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      className={cn(
        "rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      {...props}
    >
      {/* Premium Shine Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
      
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}
