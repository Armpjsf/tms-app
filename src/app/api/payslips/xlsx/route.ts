import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"
import { getSession } from "@/lib/session"
import { getDriverSession } from "@/lib/auth-utils"

const BUCKET = "company-assets"
const TABLE = "Driver_Payslips"

export const dynamic = "force-dynamic"

/** ดาวน์โหลดไฟล์ Excel รายคน (ตรวจสิทธิ์: คนขับเจ้าของ หรือ แอดมิน) */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from(TABLE)
    .select("Driver_ID, xlsx_url, title, period_label")
    .eq("id", id)
    .single()

  if (!row || !row.xlsx_url) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  // ตรวจสิทธิ์
  const driverSession = await getDriverSession()
  const isOwner = driverSession?.driverId && String(driverSession.driverId) === String(row.Driver_ID)
  let isAdmin = false
  if (!isOwner) {
    const s = await getSession()
    isAdmin = !!s && (s.roleId === 1 || s.roleId === 2)
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { data: blob, error } = await supabase.storage.from(BUCKET).download(row.xlsx_url as string)
  if (error || !blob) return NextResponse.json({ error: "download failed" }, { status: 500 })

  const arrayBuf = await blob.arrayBuffer()
  const safeName = `${row.title || "payslip"}${row.period_label ? "_" + row.period_label : ""}`
    .replace(/[^\p{L}\p{N}\-_. ]/gu, "_")
    .slice(0, 80)

  return new NextResponse(arrayBuf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}.xlsx"; filename*=UTF-8''${encodeURIComponent(safeName)}.xlsx`,
    },
  })
}
