import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { ProfileContent } from "@/components/mobile/profile-content"

import { getDriverScore } from "@/lib/supabase/drivers"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const score = await getDriverScore(session.driverId)

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="โปรไฟล์" />
      <ProfileContent session={session} score={score} />
    </div>
  )
}
