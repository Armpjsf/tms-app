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
  const page = Number(searchParams.page) || 1
  const limit = 50

  // Fetch data on server
  const [{ data: pods, count }, stats] = await Promise.all([
    getAllPODs(page, limit, dateFrom, dateTo, query), 
    getPODStats(dateFrom, dateTo),
  ])


  return (
    <DashboardLayout>
       <PODClientPage 
          pods={pods || []} 
          stats={stats} 
          count={count || 0}
          limit={limit}
          searchParams={{ from: dateFrom, to: dateTo, q: query, page }} 
       />
    </DashboardLayout>
  )
}
