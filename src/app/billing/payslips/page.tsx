import { getAdminSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { listPayslipsAdmin } from "@/lib/actions/payslip-actions"
import PayslipsClient from "./client-page"

export const dynamic = "force-dynamic"

export default async function PayslipsAdminPage() {
  const session = await getAdminSession()
  if (!session) redirect("/dashboard")

  const list = await listPayslipsAdmin()
  return <PayslipsClient initialList={list} />
}
