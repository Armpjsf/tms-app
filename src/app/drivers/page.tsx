import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriversContent } from "@/components/drivers/drivers-content"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DriversPage(props: Props) {
  const searchParams = await props.searchParams

  return (
    <DashboardLayout>
      {/* @ts-ignore */}
      <DriversContent searchParams={searchParams} />
    </DashboardLayout>
  )
}
