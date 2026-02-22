"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
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
}

const BranchContext = createContext<BranchContextType>({
  selectedBranch: "All",
  setSelectedBranch: () => {},
  branches: [],
  isAdmin: false,
  isLoading: true
})

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<string>("All")
  const [branches, setBranches] = useState<Branch[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function init() {
        try {
            const [fetchedBranches, roleId] = await Promise.all([
                getAllBranches(),
                getCurrentUserRole()
            ])
            
            setBranches(fetchedBranches || [])
            setIsAdmin(roleId === 1)

            // 1. Priority: URL Search Parameter
            const urlBranch = searchParams.get('branch')
            // 2. Secondary: Cookie
            const savedBranch = Cookies.get("selectedBranch")
            
            let finalBranch = 'All'
            
            if (urlBranch && (urlBranch === 'All' || fetchedBranches.some((b: Branch) => b.Branch_ID === urlBranch))) {
                finalBranch = urlBranch
            } else if (savedBranch && (savedBranch === 'All' || fetchedBranches.some((b: Branch) => b.Branch_ID === savedBranch))) {
                finalBranch = savedBranch
            }

            setSelectedBranchState(finalBranch)
            if (finalBranch !== savedBranch) {
                Cookies.set("selectedBranch", finalBranch, { expires: 365 })
            }
        } catch (e) {
            console.error("Failed to init branch context", e)
        } finally {
            setIsLoading(false)
        }
    }
    init()
  }, [searchParams])

  const setSelectedBranch = (branchId: string) => {
    setSelectedBranchState(branchId)
    Cookies.set("selectedBranch", branchId, { expires: 365 })
    
    // Explicitly update URL to trigger server component re-render
    const url = new URL(window.location.href)
    url.searchParams.set('branch', branchId)
    router.push(url.pathname + url.search)
    
    router.refresh()
  }

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches, isAdmin, isLoading }}>
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () => useContext(BranchContext)
