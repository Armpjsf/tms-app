"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5",
        outline:
          "border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/30",
        secondary:
          "bg-white/10 text-white backdrop-blur-sm hover:bg-white/15",
        ghost: "text-white/70 hover:bg-white/5 hover:text-white",
        link: "text-indigo-400 underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5",
        glass:
          "bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-block"
      >
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={loading || props.disabled}
          {...props}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              กำลังโหลด...
            </>
          ) : (
            children
          )}
        </Comp>
      </motion.div>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
