"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { parseLoadDetailWithAI, type ParsedLoadDetail } from "@/lib/ai/load-detail-ocr"

export interface ResolvedDrop {
  orderNo?: string
  customerCode?: string
  customerName?: string
  shipTo?: string
  tambon?: string
  amphoe?: string
  province?: string
  matched: boolean       // found a saved location by Customer_Code
  hasCoord: boolean       // that location already has coordinates
  locationName?: string | null
}

export interface ResolvedLoadDetail extends Omit<ParsedLoadDetail, "drops"> {
  drops: ResolvedDrop[]
}

/**
 * OCR a Load Detail photo, then match each drop's customer code to a saved
 * location so the admin can see which drops are known vs new before creating a
 * job. (Pure read — creates nothing yet.)
 */
export async function ocrLoadDetail(base64: string, mimeType: string): Promise<ResolvedLoadDetail> {
  const parsed = await parseLoadDetailWithAI(base64, mimeType)

  const codes = parsed.drops.map(d => d.customerCode).filter(Boolean) as string[]
  const byCode = new Map<string, { Name?: string; Lat?: number | null }>()

  if (codes.length) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("Master_Locations")
      .select("Location_ID, Name, Customer_Code, Lat")
      .in("Customer_Code", codes)
    ;(data || []).forEach((l: { Customer_Code?: string; Name?: string; Lat?: number | null }) => {
      if (l.Customer_Code) byCode.set(String(l.Customer_Code), l)
    })
  }

  const drops: ResolvedDrop[] = parsed.drops.map(d => {
    const loc = d.customerCode ? byCode.get(d.customerCode) : undefined
    return {
      ...d,
      matched: !!loc,
      hasCoord: !!loc && loc.Lat != null,
      locationName: loc?.Name ?? null,
    }
  })

  return { ...parsed, drops }
}
