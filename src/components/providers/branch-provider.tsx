"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense, useTransition } from "react"
import { getAllBranches, Branch } from "@/lib/supabase/branches"
import { getCurrentUserRole } from "@/lib/supabase/routes"
import Cookies from "js-cookie"
import { useRouter, useSearchParams } from "next/navigation"

interface BranchContextType {
  selectedBranch: string
  setSelectedBranch: (branchId: string) => void
  branches: Branch[]
  isAdmin: boolean
  isLoading: boolean
  isPending: boolean
}

const BranchContext = createContext<BranchContextType>({
  selectedBranch: "All",
  setSelectedBranch: () => {},
  branches: [],
  isAdmin: false,
  isLoading: true,
  isPending: false
})

/**
 * Surgical Component to isolate useSearchParams suspension.
 * This prevents the entire provider tree from unmounting during hydration.
 */
function BranchParamSync({ 
    onParamFound,
    branches 
}: { 
    onParamFound: (branch: string) => void,
    branches: Branch[]
}) {
  const searchParams = useSearchParams()
  const branchParam = searchParams.get('branch')

  useEffect(() => {
    if (branchParam && (branchParam === 'All' || branches.some(b => b.Branch_ID === branchParam))) {
        onParamFound(branchParam)
    }
  }, [branchParam, branches, onParamFound])

  return null
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<string>("All")
  const [branches, setBranches] = useState<Branch[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const init = useCallback(async () => {
    try {
        const [fetchedBranches, roleId] = await Promise.all([
            getAllBranches(),
            getCurrentUserRole()
        ]) as [Branch[], number]
        
        setBranches(fetchedBranches || [])
        setIsAdmin(roleId === 1) // Only Super Admin (Role 1) can switch branches

        // Only sync from cookie if not already set by URL param
        const savedBranch = Cookies.get("selectedBranch")
        if (savedBranch && (savedBranch === 'All' || fetchedBranches.some((b: Branch) => b.Branch_ID === savedBranch))) {
            setSelectedBranchState(prev => prev === 'All' ? savedBranch : prev)
        }
    } catch (error) {
        console.warn("BranchProvider initialization partial failure or timeout:", error)
        // Set defaults if we timed out
        if (branches.length === 0) setBranches([])
    } finally {
        setIsLoading(false)
    }
  }, [branches.length])

  useEffect(() => {
    init()
  }, [init])

  const setSelectedBranch = useCallback((branchId: string) => {
    setSelectedBranchState(branchId)
    Cookies.set("selectedBranch", branchId, { expires: 365 })
    
    // Use transition for non-blocking navigation/refresh
    startTransition(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('branch', branchId)
        router.push(url.pathname + url.search)
        router.refresh()
    })
  }, [router])

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches, isAdmin, isLoading, isPending }}>
      {/* Isolate SearchParams suspension here */}
      <Suspense fallback={null}>
        <BranchParamSync 
            branches={branches} 
            onParamFound={setSelectedBranchState} 
        />
      </Suspense>
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () => useContext(BranchContext)
