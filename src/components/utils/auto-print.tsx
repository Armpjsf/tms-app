
"use client"

import * as React from "react"

/**
 * AutoPrint Component
 * Triggers the browser print dialog after a short delay once the component mounts.
 * Used in invoice and billing pages for automated workflows.
 */
export function AutoPrint() {
  React.useEffect(() => {
    // Small delay to ensure content is fully rendered and hydrated
    const timer = setTimeout(() => {
      try {
        window.print()
      } catch (error) {
        console.error("AutoPrint failed:", error)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return null
}
