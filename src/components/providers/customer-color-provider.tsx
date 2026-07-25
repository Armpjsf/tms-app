"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useCustomer } from "@/components/providers/customer-provider"
import { colorByIndex, customerColor } from "@/lib/utils/customer-color"

type ColorFn = (name?: string | null) => string

const CustomerColorContext = createContext<ColorFn>(customerColor)

/**
 * Assigns each customer an evenly-spread colour by their position in the customer
 * list (sorted by Customer_ID for a stable, append-only order — a new customer
 * gets the next slot without changing anyone else's colour). Guarantees clear
 * separation for dozens of customers and the same colour on every page.
 * Unknown names (not yet loaded) fall back to the stateless hash colour.
 */
export function CustomerColorProvider({ children }: { children: React.ReactNode }) {
  const { customers } = useCustomer()

  const colorFn = useMemo<ColorFn>(() => {
    const byName = new Map<string, string>()
    const ordered = [...customers].sort((a, b) =>
      String(a.Customer_ID || "").localeCompare(String(b.Customer_ID || ""))
    )
    ordered.forEach((c, i) => {
      const name = String(c.Customer_Name || "").trim()
      if (name && !byName.has(name)) byName.set(name, colorByIndex(i))
    })
    return (name?: string | null) => {
      const key = String(name || "").trim()
      return byName.get(key) ?? customerColor(key)
    }
  }, [customers])

  return (
    <CustomerColorContext.Provider value={colorFn}>
      {children}
    </CustomerColorContext.Provider>
  )
}

/** Returns a function that maps a customer name → its stable, distinct colour. */
export const useCustomerColor = () => useContext(CustomerColorContext)
