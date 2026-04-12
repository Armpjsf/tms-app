"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ChartContainerProps {
  children: ReactNode
  className?: string
  height?: string | number
}

/**
 * A mount-safe wrapper for Recharts charts.
 * Delays rendering children until the container has been laid out with positive dimensions,
 * preventing the "width(-1) and height(-1)" console warnings from ResponsiveContainer.
 */
export function ChartContainer({ children, className, height = "100%" }: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Use requestAnimationFrame to wait for browser layout pass
    const id = requestAnimationFrame(() => {
      if (ref.current && ref.current.clientWidth > 0 && ref.current.clientHeight > 0) {
        setReady(true)
      } else {
        // Fallback: try again after a short delay
        const timer = setTimeout(() => setReady(true), 100)
        return () => clearTimeout(timer)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={ref}
      className={cn("w-full relative", className)}
      style={{ height, minHeight: 0, minWidth: 0 }}
    >
      {ready ? children : null}
    </div>
  )
}
