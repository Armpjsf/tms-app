"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { getAllBranches, Branch } from "@/lib/supabase/branches"
import { getCurrentUserRole } from "@/lib/supabase/routes"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

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

  useEffect(() => {
    async function init() {
        try {
            const [fetchedBranches, roleId] = await Promise.all([
                getAllBranches(),
                getCurrentUserRole()
            ])
            
            console.log("Fetched Branches:", fetchedBranches)
            setBranches(fetchedBranches || [])
            setIsAdmin(roleId === 1) // Assuming 1 is Super Admin

            // Restore from cookie or default to 'All'
            const savedBranch = Cookies.get("selectedBranch")
            if (savedBranch) {
                // Verify if saved branch still exists or is 'All'
                if (savedBranch === 'All' || (fetchedBranches && fetchedBranches.some((b: Branch) => b.Branch_ID === savedBranch))) {
                    setSelectedBranchState(savedBranch)
                }
            }
        } catch (e) {
            console.error("Failed to init branch context", e)
        } finally {
            setIsLoading(false)
        }
    }
    init()
  }, [])

  const setSelectedBranch = (branchId: string) => {
    setSelectedBranchState(branchId)
    Cookies.set("selectedBranch", branchId, { expires: 365 })
    router.refresh() // Force server components to re-render with new cookie
  }

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches, isAdmin, isLoading }}>
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () => useContext(BranchContext)
