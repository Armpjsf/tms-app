"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface PremiumButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg" | "xl" | "icon"
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
    primary: "bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-110",
    secondary: "bg-secondary text-secondary-foreground border border-border shadow-lg shadow-lg hover:brightness-110",
    outline: "bg-transparent border-2 border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
    ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-accent text-white shadow-lg shadow-accent/25 hover:brightness-110",
  }

  const sizes = {
    sm: "px-4 py-2 text-xl",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    xl: "px-10 py-5 text-xl",
    icon: "h-16 w-16 p-0",
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

