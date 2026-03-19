import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriversContent } from "@/components/drivers/drivers-content"
import { isAdmin } from "@/lib/permissions"
import { getAllBranches, Branch } from "@/lib/supabase/branches"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DriversPage(props: Props) {
  const searchParams = await props.searchParams
  const isUserAdmin = await isAdmin()
  const branchesData = isUserAdmin ? await getAllBranches() : []
  const branches: Branch[] = branchesData || []

  return (
    <DashboardLayout>
      {/* @ts-expect-error - Complex server component props */}
      <DriversContent searchParams={searchParams} branches={branches} isAdmin={isUserAdmin} />
    </DashboardLayout>
  )
}
