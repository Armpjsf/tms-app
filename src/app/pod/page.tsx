export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAllPODs, getPODStats } from "@/lib/supabase/pod"
import PODClientPage from "./pods-client"

export default async function PODPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const dateFrom = (searchParams.from as string) || ''
  const dateTo = (searchParams.to as string) || ''
  const query = (searchParams.q as string) || ''

  // Fetch data on server
  const [{ data: pods }, stats] = await Promise.all([
    getAllPODs(1, 100, dateFrom, dateTo, query), 
    getPODStats(),
  ])

  return (
    <DashboardLayout>
       <PODClientPage 
          pods={pods || []} 
          stats={stats} 
          searchParams={{ from: dateFrom, to: dateTo, q: query }} 
       />
    </DashboardLayout>
  )
}
