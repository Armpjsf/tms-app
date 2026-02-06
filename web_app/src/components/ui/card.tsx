"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CardProps {
  className?: string
  variant?: "default" | "glass" | "gradient" | "glow"
  hover?: boolean
  children?: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = true, children }, ref) => {
    const variants = {
      default: "bg-slate-800/50 border-white/10",
      glass: "glass-card",
      gradient: "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-white/10",
      glow: "bg-slate-800/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10",
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300",
          variants[variant],
          hover && "hover:border-white/20 hover:shadow-xl",
          className
        )}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = "Card"

interface CardSubProps {
  className?: string
  children?: React.ReactNode
}

const CardHeader = React.forwardRef<HTMLDivElement, CardSubProps>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
    >
      {children}
    </div>
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, CardSubProps>(
  ({ className, children }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-none tracking-tight text-white",
        className
      )}
    >
      {children}
    </h3>
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, CardSubProps>(
  ({ className, children }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-slate-400", className)}
    >
      {children}
    </p>
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, CardSubProps>(
  ({ className, children }, ref) => (
    <div ref={ref} className={cn("", className)}>
      {children}
    </div>
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, CardSubProps>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4", className)}
    >
      {children}
    </div>
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
