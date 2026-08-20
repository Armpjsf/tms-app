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
    CO2_COEFFICIENTS,
    type CarbonFactors,
} from "@/lib/utils/esg-utils"

const CACHE_TTL_MS = 60_000
let cache: { data: CarbonFactors; ts: number } | null = null

export type FreightFactorItem = {
    id: string
    vehicle_type: string
    payload_tonnes: number | null
    ef_tkm: number | null
    co2_per_km: number
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
    const freightPerKm: Record<string, number> = { ...CO2_COEFFICIENTS }

    try {
        const supabase = createAdminClient()
        const [{ data: fuels }, { data: freight }] = await Promise.all([
            supabase.from("tgo_emission_factors").select("fuel_code, ef_value, is_active"),
            supabase.from("tgo_freight_factors").select("vehicle_type, co2_per_km, is_active"),
        ])
        for (const f of fuels || []) {
            if (f?.is_active !== false && f?.fuel_code && f?.ef_value != null) {
                fuelEF[f.fuel_code] = Number(f.ef_value)
            }
        }
        for (const f of freight || []) {
            if (f?.is_active !== false && f?.vehicle_type && f?.co2_per_km != null) {
                freightPerKm[f.vehicle_type] = Number(f.co2_per_km)
            }
        }
    } catch {
        /* DB unreachable / tables not created → use hardcoded defaults */
    }

    const data: CarbonFactors = { fuelEF, freightPerKm }
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
