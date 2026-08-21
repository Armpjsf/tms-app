"use server"

/**
 * Carbon factors — single source that makes the /settings/esg screen actually
 * drive the carbon calculation. Reads editable values from the DB
 * (tgo_emission_factors = fuel EF per liter, tgo_freight_factors = per-km freight
 * EF per vehicle type) and merges them over the hardcoded TGO defaults so the
 * calc never breaks if a table is empty or a row is missing.
 *
 * A short in-memory cache avoids a DB round-trip on every job in an analytics
 * loop; it self-refreshes so edits in settings take effect within ~1 minute.
 */

import { createAdminClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/services/permission-guards"
import { revalidatePath } from "next/cache"
import {
    TGO_EMISSION_FACTORS,
    TGO_WTT_FACTORS,
    CO2_COEFFICIENTS,
    WTT_FREIGHT_COEFFICIENTS,
    EMPTY_RETURN_RATIO,
    TREE_ABSORB_KG_PER_YEAR,
    type CarbonFactors,
} from "@/lib/utils/esg-utils"

const CACHE_TTL_MS = 60_000
let cache: { data: CarbonFactors; ts: number } | null = null

export type FreightFactorItem = {
    id: string
    vehicle_type: string
    payload_tonnes: number | null
    ef_tkm: number | null
    co2_per_km: number       // TTW kgCO2e/km (การเผาไหม้)
    wtt_per_km: number       // WTT kgCO2e/km (ต้นน้ำเชื้อเพลิง)
    mode: string
    effective_date: string
    notes?: string
    is_active: boolean
}

/**
 * Returns the live carbon factors (DB overlaid on hardcoded defaults). Cached
 * for CACHE_TTL_MS. Pass the result into calculateJobEmissions(...).
 */
export async function getCarbonFactors(): Promise<CarbonFactors> {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data

    // Start from hardcoded defaults so any missing DB row stays covered.
    const fuelEF: Record<string, number> = { ...TGO_EMISSION_FACTORS }
    const fuelWTT: Record<string, number> = { ...TGO_WTT_FACTORS }
    const freightPerKm: Record<string, number> = { ...CO2_COEFFICIENTS }
    const freightWTTPerKm: Record<string, number> = { ...WTT_FREIGHT_COEFFICIENTS }
    const freightEfTkm: Record<string, number> = {}
    let emptyReturnRatio = EMPTY_RETURN_RATIO
    let treeAbsorbKgPerYear = TREE_ABSORB_KG_PER_YEAR

    try {
        const supabase = createAdminClient()
        const [{ data: fuels }, { data: freight }, { data: params }] = await Promise.all([
            supabase.from("tgo_emission_factors").select("fuel_code, ef_value, wtt_value, is_active"),
            supabase.from("tgo_freight_factors").select("vehicle_type, co2_per_km, wtt_per_km, ef_tkm, is_active"),
            supabase.from("esg_parameters").select("param_key, param_value"),
        ])
        for (const f of fuels || []) {
            if (f?.is_active !== false && f?.fuel_code && f?.ef_value != null) {
                fuelEF[f.fuel_code] = Number(f.ef_value)
                if (f?.wtt_value != null) fuelWTT[f.fuel_code] = Number(f.wtt_value)
            }
        }
        for (const f of freight || []) {
            if (f?.is_active !== false && f?.vehicle_type && f?.co2_per_km != null) {
                freightPerKm[f.vehicle_type] = Number(f.co2_per_km)
                if (f?.wtt_per_km != null) freightWTTPerKm[f.vehicle_type] = Number(f.wtt_per_km)
                if (f?.ef_tkm != null) freightEfTkm[f.vehicle_type] = Number(f.ef_tkm)
            }
        }
        const findParam = (k: string) => (params || []).find((p: { param_key?: string }) => p?.param_key === k)?.param_value
        const rawRatio = findParam("empty_return_ratio")
        if (rawRatio != null && Number.isFinite(Number(rawRatio))) emptyReturnRatio = Number(rawRatio)
        const rawTree = findParam("tree_absorb_kg_per_year")
        if (rawTree != null && Number.isFinite(Number(rawTree)) && Number(rawTree) > 0) treeAbsorbKgPerYear = Number(rawTree)
    } catch {
        /* DB unreachable / tables not created / columns not migrated → use hardcoded defaults */
    }

    const data: CarbonFactors = {
        fuelEF, fuelWTT, freightPerKm, freightWTTPerKm, freightEfTkm,
        emptyReturnRatio,
        roundTripEmissionFactor: 1 + emptyReturnRatio,
        treeAbsorbKgPerYear,
    }
    cache = { data, ts: Date.now() }
    return data
}

function invalidate() { cache = null }

// ── Freight factor CRUD (used by the ESG settings screen) ──

export async function getFreightFactorsList(): Promise<FreightFactorItem[]> {
    try {
        await requireAdmin()
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from("tgo_freight_factors")
            .select("*")
            .order("co2_per_km", { ascending: false })
        if (error) return []
        return (data || []).map((i: Record<string, unknown>) => ({
            id: String(i.id),
            vehicle_type: String(i.vehicle_type),
            payload_tonnes: i.payload_tonnes != null ? Number(i.payload_tonnes) : null,
            ef_tkm: i.ef_tkm != null ? Number(i.ef_tkm) : null,
            co2_per_km: Number(i.co2_per_km),
            wtt_per_km: i.wtt_per_km != null ? Number(i.wtt_per_km) : 0,
            mode: String(i.mode || "normal"),
            effective_date: String(i.effective_date),
            notes: (i.notes as string) || "",
            is_active: (i.is_active as boolean) ?? true,
        }))
    } catch {
        return []
    }
}

export async function upsertFreightFactor(payload: {
    id?: string
    vehicle_type: string
    payload_tonnes?: number | null
    ef_tkm?: number | null
    co2_per_km: number
    wtt_per_km?: number | null
    mode?: string
    effective_date?: string
    notes?: string
    is_active?: boolean
}): Promise<{ success: boolean; message?: string }> {
    try {
        await requireAdmin()
        const supabase = createAdminClient()
        const row = {
            vehicle_type: payload.vehicle_type.trim(),
            payload_tonnes: payload.payload_tonnes ?? null,
            ef_tkm: payload.ef_tkm ?? null,
            co2_per_km: payload.co2_per_km,
            wtt_per_km: payload.wtt_per_km ?? 0,
            mode: payload.mode || "normal",
            effective_date: payload.effective_date || new Date().toISOString().slice(0, 10),
            notes: payload.notes || "",
            is_active: payload.is_active ?? true,
            updated_at: new Date().toISOString(),
        }
        const { error } = payload.id
            ? await supabase.from("tgo_freight_factors").update(row).eq("id", payload.id)
            : await supabase.from("tgo_freight_factors").insert([row])
        if (error) throw error
        invalidate()
        revalidatePath("/settings/esg")
        return { success: true, message: "บันทึกค่า EF ขนส่งสำเร็จ" }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" }
    }
}

// ── ESG global parameter (empty-return ratio) ──

/** อ่านสัดส่วนเที่ยวกลับรถเปล่า (fallback = ค่า default ในโค้ด). */
export async function getEmptyReturnRatio(): Promise<number> {
    const { emptyReturnRatio } = await getCarbonFactors()
    return emptyReturnRatio ?? EMPTY_RETURN_RATIO
}

/** บันทึกสัดส่วนเที่ยวกลับรถเปล่า (0–1) ลงตาราง esg_parameters. */
export async function upsertEmptyReturnRatio(value: number): Promise<{ success: boolean; message?: string }> {
    try {
        await requireAdmin()
        if (!Number.isFinite(value) || value < 0 || value > 1) {
            return { success: false, message: "ค่าต้องอยู่ระหว่าง 0–1" }
        }
        const supabase = createAdminClient()
        const { error } = await supabase.from("esg_parameters").upsert(
            { param_key: "empty_return_ratio", param_value: value, updated_at: new Date().toISOString() },
            { onConflict: "param_key" }
        )
        if (error) throw error
        invalidate()
        revalidatePath("/settings/esg")
        return { success: true, message: "บันทึกสัดส่วนเที่ยวกลับสำเร็จ" }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" }
    }
}

export type EsgParameterItem = { param_key: string; param_value: number; notes: string; updated_at?: string }

/** ดึงพารามิเตอร์ ESG ทั้งหมด (empty_return_ratio, tree_absorb_kg_per_year, ...) สำหรับ Evidence Report. */
export async function getEsgParametersList(): Promise<EsgParameterItem[]> {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase.from("esg_parameters").select("*").order("param_key")
        if (error) return []
        return (data || []).map((i: Record<string, unknown>) => ({
            param_key: String(i.param_key),
            param_value: Number(i.param_value),
            notes: (i.notes as string) || "",
            updated_at: i.updated_at as string | undefined,
        }))
    } catch {
        return []
    }
}

/** อ่านอัตราดูดซับคาร์บอนของต้นไม้ (kgCO2/ต้น/ปี). */
export async function getTreeAbsorbKgPerYear(): Promise<number> {
    const { treeAbsorbKgPerYear } = await getCarbonFactors()
    return treeAbsorbKgPerYear ?? TREE_ABSORB_KG_PER_YEAR
}

/** บันทึกอัตราดูดซับคาร์บอนของต้นไม้ (kgCO2/ต้น/ปี) ลงตาราง esg_parameters. */
export async function upsertTreeAbsorbKgPerYear(value: number): Promise<{ success: boolean; message?: string }> {
    try {
        await requireAdmin()
        if (!Number.isFinite(value) || value <= 0 || value > 1000) {
            return { success: false, message: "ค่าต้องมากกว่า 0 (kgCO2/ต้น/ปี)" }
        }
        const supabase = createAdminClient()
        const { error } = await supabase.from("esg_parameters").upsert(
            { param_key: "tree_absorb_kg_per_year", param_value: value, updated_at: new Date().toISOString() },
            { onConflict: "param_key" }
        )
        if (error) throw error
        invalidate()
        revalidatePath("/settings/esg")
        return { success: true, message: "บันทึกอัตราดูดซับต้นไม้สำเร็จ" }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" }
    }
}

export async function deleteFreightFactor(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await requireAdmin()
        const supabase = createAdminClient()
        const { error } = await supabase.from("tgo_freight_factors").delete().eq("id", id)
        if (error) throw error
        invalidate()
        revalidatePath("/settings/esg")
        return { success: true, message: "ลบรายการสำเร็จ" }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "ลบไม่สำเร็จ" }
    }
}
