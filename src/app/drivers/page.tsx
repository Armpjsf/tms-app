import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriversContent } from "@/components/drivers/drivers-content"
import { isSuperAdmin } from "@/lib/permissions"
import { getAllBranches, Branch } from "@/lib/supabase/branches"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DriversPage(props: Props) {
  const searchParams = await props.searchParams
  const isAdmin = await isSuperAdmin()
  const branches: Branch[] = isAdmin ? await getAllBranches() : []

  return (
    <DashboardLayout>
      {/* @ts-ignore */}
      <DriversContent searchParams={searchParams} branches={branches} isSuperAdmin={isAdmin} />
    </DashboardLayout>
  )
}
