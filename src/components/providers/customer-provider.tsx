"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense, useTransition, useRef } from "react"
import { getAllCustomers, Customer } from "@/lib/supabase/customers"
import { getCustomerSessionInfo } from "@/lib/actions/customer-fetcher"
import { useBranch } from "@/components/providers/branch-provider"
import Cookies from "js-cookie"
import { useRouter, usePathname } from "next/navigation"

interface CustomerContextType {
  selectedCustomer: string
  setSelectedCustomer: (customerId: string) => void
  customers: Customer[]
  isLoading: boolean
  isPending: boolean
  isCustomerUser: boolean
  currentUserCustomerId: string | null
}

const CustomerContext = createContext<CustomerContextType>({
  selectedCustomer: "All",
  setSelectedCustomer: () => {},
  customers: [],
  isLoading: true,
  isPending: false,
  isCustomerUser: false,
  currentUserCustomerId: null
})

// A selection is valid when it is 'All' or a comma-separated list whose every
// token is a known customer id (supports the multi-select filter).
function isValidCustomerSelection(value: string, customers: Customer[]): boolean {
  if (value === 'All') return true
  const ids = value.split(',').map(s => s.trim()).filter(Boolean)
  return ids.length > 0 && ids.every(id => customers.some(c => c.Customer_ID === id))
}

function CustomerParamSync({
  onParamFound,
  customers 
}: { 
  onParamFound: (customer: string) => void,
  customers: Customer[]
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const custParam = params.get('customer')
      // Accept 'All' or a comma-separated list where every id is known (multi-select).
      if (custParam && isValidCustomerSelection(custParam, customers)) {
          onParamFound(custParam)
      }
    }
  }, [customers, onParamFound])

  return null
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [selectedCustomer, setSelectedCustomerState] = useState<string>("All")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isCustomerUser, setIsCustomerUser] = useState(false)
  const [currentUserCustomerId, setCurrentUserCustomerId] = useState<string | null>(null)
  
  const { selectedBranch } = useBranch()
  const router = useRouter()
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)
  const initialized = useRef(false)

  const init = useCallback(async () => {
    setIsLoading(true)
    try {
        const [customerRes, sessionInfo] = await Promise.all([
            getAllCustomers(undefined, undefined, undefined, selectedBranch === 'All' ? undefined : selectedBranch),
            getCustomerSessionInfo()
        ])
        
        const fetchedCustomers = customerRes.data || []
        setCustomers(fetchedCustomers)
        setIsCustomerUser(sessionInfo.isCustomerUser)
        setCurrentUserCustomerId(sessionInfo.customerId)
        
        // Sync with cookie or URL (value may be a comma-separated multi-select list)
        const savedCustomer = Cookies.get("selectedCustomer")
        if (savedCustomer && isValidCustomerSelection(savedCustomer, fetchedCustomers)) {
            setSelectedCustomerState(prev => prev === 'All' ? savedCustomer : prev)
        }
    } catch (error) {
        console.warn("CustomerProvider initialization failed:", error)
        setCustomers([])
    } finally {
        setIsLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const prevPathname = prevPathnameRef.current
    prevPathnameRef.current = pathname

    if (pathname === "/login") {
      setCustomers([])
      setSelectedCustomerState("All")
      setIsCustomerUser(false)
      setCurrentUserCustomerId(null)
      setIsLoading(true)
      initialized.current = false
    } else if (prevPathname === "/login" && pathname !== "/login") {
      initialized.current = false
      init()
    }
  }, [pathname, init])

  const setSelectedCustomer = useCallback((customerId: string) => {
    setSelectedCustomerState(customerId)
    Cookies.set("selectedCustomer", customerId, { expires: 365 })
    
    startTransition(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('customer', customerId)
        url.searchParams.delete('customers') // Clear dashboard-specific filters to prevent conflicts
        router.push(url.pathname + url.search)
        router.refresh()
    })
  }, [router])

  return (
    <CustomerContext.Provider value={{ selectedCustomer, setSelectedCustomer, customers, isLoading, isPending, isCustomerUser, currentUserCustomerId }}>
      <Suspense fallback={null}>
        <CustomerParamSync 
            customers={customers} 
            onParamFound={setSelectedCustomerState} 
        />
      </Suspense>
      {children}
    </CustomerContext.Provider>
  )
}

export const useCustomer = () => useContext(CustomerContext)

