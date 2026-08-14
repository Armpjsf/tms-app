"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadFileToSupabase } from "@/lib/actions/supabase-upload"
import { getUserId } from "@/lib/permissions"

// Maps a renewable document type to the Master_Vehicles column that holds its
// current expiry date, so logging a renewal also moves the live expiry forward.
const DOC_EXPIRY_COLUMN: Record<string, string> = {
    tax: 'Tax_Expiry',
    insurance: 'Insurance_Expiry',
    act: 'Act_Expiry',
    cargo: 'Cargo_Insurance_Expiry',
}

async function uploadOptionalFile(file: File | null, prefix: string): Promise<string | null> {
    if (!file || file.size === 0) return null
    const buffer = Buffer.from(await file.arrayBuffer())
    const name = `${prefix}_${Date.now()}_${file.name}`
    const res = await uploadFileToSupabase(buffer, name, file.type || 'application/octet-stream', 'Vehicle_Docs')
    return res.directLink || null
}

// ── Document renewals (tax / insurance / ACT / cargo) ───────────────────────

export async function renewVehicleDocument(formData: FormData) {
    const plate = formData.get('plate') as string
    const docType = formData.get('doc_type') as string
    const newExpiry = (formData.get('new_expiry') as string) || null
    const renewedDate = (formData.get('renewed_date') as string) || new Date().toISOString().slice(0, 10)
    const oldExpiry = (formData.get('old_expiry') as string) || null
    const cost = formData.get('cost') ? Number(formData.get('cost')) : null
    const vendor = (formData.get('vendor') as string) || null
    const note = (formData.get('note') as string) || null
    const file = formData.get('file') as File | null

    if (!plate || !docType) return { success: false, error: 'ข้อมูลไม่ครบ (ทะเบียน/ประเภทเอกสาร)' }

    const supabase = createAdminClient()
    try {
        const fileUrl = await uploadOptionalFile(file, `${plate}_${docType}`)
        const createdBy = await getUserId().catch(() => null)

        const { error: insErr } = await supabase.from('Vehicle_Document_Renewals').insert({
            Vehicle_Plate: plate,
            doc_type: docType,
            renewed_date: renewedDate,
            old_expiry: oldExpiry,
            new_expiry: newExpiry,
            cost,
            vendor,
            file_url: fileUrl,
            note,
            created_by: createdBy,
        })
        if (insErr) return { success: false, error: insErr.message }

        // Move the vehicle's live expiry date forward.
        const col = DOC_EXPIRY_COLUMN[docType]
        if (col && newExpiry) {
            await supabase.from('Master_Vehicles').update({ [col]: newExpiry }).eq('Vehicle_Plate', plate)
        }

        revalidatePath('/vehicles')
        return { success: true }
    } catch (err) {
        return { success: false, error: (err as Error).message }
    }
}

export async function getVehicleRenewals(plate: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('Vehicle_Document_Renewals')
        .select('*')
        .eq('Vehicle_Plate', plate)
        .order('renewed_date', { ascending: false })
    return data || []
}

// ── Tire logs (change / patch / rotate) ─────────────────────────────────────

export async function addTireLog(formData: FormData) {
    const plate = formData.get('plate') as string
    const action = formData.get('action') as string // change | patch | rotate
    const position = (formData.get('position') as string) || null
    const serviceDate = (formData.get('service_date') as string) || new Date().toISOString().slice(0, 10)
    const odometer = formData.get('odometer') ? Math.round(Number(formData.get('odometer'))) : null
    const brand = (formData.get('brand') as string) || null
    const qty = formData.get('qty') ? Math.round(Number(formData.get('qty'))) : null
    const cost = formData.get('cost') ? Number(formData.get('cost')) : null
    const vendor = (formData.get('vendor') as string) || null
    const nextChange = formData.get('next_change_mileage') ? Math.round(Number(formData.get('next_change_mileage'))) : null
    const note = (formData.get('note') as string) || null
    const file = formData.get('file') as File | null

    if (!plate || !action) return { success: false, error: 'ข้อมูลไม่ครบ (ทะเบียน/การดำเนินการ)' }

    const supabase = createAdminClient()
    try {
        const fileUrl = await uploadOptionalFile(file, `${plate}_tire`)
        const createdBy = await getUserId().catch(() => null)

        const { error: insErr } = await supabase.from('Tire_Logs').insert({
            Vehicle_Plate: plate,
            action,
            position,
            service_date: serviceDate,
            odometer,
            brand,
            qty,
            cost,
            vendor,
            next_change_mileage: nextChange,
            file_url: fileUrl,
            note,
            created_by: createdBy,
        })
        if (insErr) return { success: false, error: insErr.message }

        // A full change updates the vehicle's live tire status used for reminders.
        if (action === 'change') {
            const update: Record<string, unknown> = { Tire_Change_Date: serviceDate }
            if (odometer != null) update.Tire_Change_Odometer = odometer
            if (nextChange != null) update.Tire_Next_Change_Mileage = nextChange
            await supabase.from('Master_Vehicles').update(update).eq('Vehicle_Plate', plate)
        }

        revalidatePath('/vehicles')
        return { success: true }
    } catch (err) {
        return { success: false, error: (err as Error).message }
    }
}

export async function getTireLogs(plate: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('Tire_Logs')
        .select('*')
        .eq('Vehicle_Plate', plate)
        .order('service_date', { ascending: false })
    return data || []
}
