import { getDriverSession } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { getMyPayslip } from "@/lib/actions/payslip-actions"
import { PayslipDetailClient } from "../payslip-detail-client"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getDriverSession()
  if (!session?.driverId) redirect("/mobile/login")

  const { id } = await params
  const res = await getMyPayslip(id)

  if (!res.ok || (!res.grid && !res.voucher)) {
    return (
      <div className="min-h-full bg-background pb-24 pt-16 px-4">
        <MobileHeader title="ใบสรุปจ่ายรถ" showBack />
        <div className="text-center py-16 text-muted-foreground">{res.error || "ไม่พบสลิป"}</div>
      </div>
    )
  }

  const meta = res.meta as Record<string, unknown>
  const total = meta.total_amount as number | null
  const subtitle = String(meta.period_label || "")

  return (
    <div className="min-h-full bg-background pb-24 pt-16 px-4">
      <MobileHeader title="ใบสรุปจ่ายรถ" showBack />

      <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 border-0 mb-4">
        <CardContent className="p-5">
          <p className="text-blue-100 text-sm">{String(meta.title || "")}</p>
          {subtitle && <p className="text-blue-100 text-xs mt-0.5">งวด {subtitle}</p>}
          {typeof total === "number" && (
            <h2 className="text-3xl font-bold text-white mt-2">฿{total.toLocaleString()}</h2>
          )}
        </CardContent>
      </Card>

      <PayslipDetailClient
        id={id}
        kind={res.kind || "excel"}
        grid={res.grid}
        voucher={res.voucher}
        title={String(meta.title || "payslip")}
        subtitle={subtitle}
        hasXlsx={!!res.hasXlsx}
      />
    </div>
  )
}
