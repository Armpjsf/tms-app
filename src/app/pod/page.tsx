export const dynamic = 'force-dynamic'

import { cookies } from "next/headers"
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

  // ลูกค้าที่เลือกจากดรอปดาวน์แถบบน (cookie) — ให้แอดมิน/ซูเปอร์กรอง POD ตามลูกค้าได้
  // (สาขาถูกกรองอัตโนมัติผ่าน getUserBranchId ที่อ่าน cookie selectedBranch อยู่แล้ว)
  const cookieStore = await cookies()
  const rawCustomer = (searchParams.customer as string) ?? cookieStore.get('selectedCustomer')?.value ?? ''
  const customerFilter = rawCustomer === 'All' ? '' : rawCustomer

  // Fetch data on server
  const [{ data: pods, count }, stats] = await Promise.all([
    getAllPODs(page, limit, dateFrom, dateTo, query, customerFilter),
    getPODStats(dateFrom, dateTo, customerFilter),
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
