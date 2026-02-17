"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { getUniqueBranches } from "@/lib/actions/branch-actions"

export function BranchFilter({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentBranch = searchParams.get('branch') || 'All'
  const [branches, setBranches] = useState<string[]>(['All'])

  useEffect(() => {
    if (isSuperAdmin) {
        getUniqueBranches().then(res => {
            if (res.length > 0) setBranches(res)
        })
    }
  }, [isSuperAdmin])

  if (!isSuperAdmin) return null

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'All') {
      params.set('branch', value)
    } else {
      params.delete('branch')
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">Branch:</span>
      <Select value={currentBranch} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-900 border-slate-700">
          <SelectValue placeholder="Select Branch" />
        </SelectTrigger>
        <SelectContent>
           {branches.map(b => (
             <SelectItem key={b} value={b}>{b}</SelectItem>
           ))}
        </SelectContent>
      </Select>
    </div>
  )
}
