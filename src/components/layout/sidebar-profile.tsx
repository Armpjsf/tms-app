"use client"

import { useState, useEffect } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { getUserProfile, UserProfile } from "@/lib/supabase/users"
import Image from "next/image"

export function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
        try {
            const data = await getUserProfile()
            setProfile(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    load()
  }, [])

  if (loading) return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border ${collapsed ? 'justify-center' : ''}`}>
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
    </div>
  )

  const displayName = profile 
    ? `${profile.First_Name || ""} ${profile.Last_Name || ""}`.trim() || profile.Username 
    : "User"
  
  const role = profile?.Role || "Staff"
  const avatarUrl = profile?.Avatar_Url

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border ${collapsed ? 'justify-center' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/80 to-primary/40 flex items-center justify-center text-primary-foreground shadow-lg overflow-hidden shrink-0">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
        ) : (
          <span className="font-bold text-lg">{(displayName || "U").charAt(0).toUpperCase()}</span>
        )}
      </div>
      
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{role}</p>
        </div>
      )}

      {!collapsed && (
        <button 
          onClick={() => window.location.href = '/api/auth/logout'}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted/50 rounded-lg transition-colors"
          title="ออกจากระบบ"
        >
          <LogOut size={18} />
        </button>
      )}
    </div>
  )
}
