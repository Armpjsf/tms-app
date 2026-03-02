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
    secondary: "bg-gray-900 text-white shadow-lg shadow-gray-900/20 hover:bg-black",
    outline: "bg-transparent border-2 border-gray-100 text-gray-700 hover:border-emerald-500 hover:text-emerald-600",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900",
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      className={cn(
        "rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  )
}
