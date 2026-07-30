import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createAdminClient } from '@/utils/supabase/server'
import { aiToolExecutors } from '@/lib/ai/tools'
import { getUserBranchId } from '@/lib/permissions'
import {
    REVENUE_STATUSES,
    getThaiNow,
    getThaiMonthBoundaries,
    formatDateSafe,
} from '@/lib/supabase/analytics-helpers'
import { embedGemini } from '@/lib/ai/embeddings'

// Gemini models to try in order. First the latest, then verified-stable fallbacks
// so the assistant keeps working even if a preview model is renamed/retired.
const GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]

type ChatMsg = { role: 'user' | 'bot' | 'model' | 'assistant', content: string }

// ─────────────────────────────────────────────────────────────────
// Gemini streaming call (SSE). Returns the raw Response so the caller
// can fall through to the next model on an HTTP error BEFORE piping.
// ─────────────────────────────────────────────────────────────────
async function callGeminiStream(
    apiKey: string,
    model: string,
    systemPrompt: string,
    history: ChatMsg[],
    userMessage: string,
): Promise<Response> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

    // Map prior turns to Gemini "contents". Gemini roles are 'user' | 'model'.
    const contents = history
        .filter(m => m && typeof m.content === 'string' && m.content.trim())
        .slice(-8) // keep last 8 turns for context without blowing the token budget
        .map(m => ({
            role: (m.role === 'user') ? 'user' : 'model',
            parts: [{ text: m.content }],
        }))

    contents.push({ role: 'user', parts: [{ text: userMessage }] })

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(30000),
    })
}

// Parse Gemini SSE body into a stream of text chunks (shared by the
// streaming and non-streaming response paths).
async function* parseGeminiSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
                const json = JSON.parse(payload)
                const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) yield text
            } catch { /* partial JSON, ignore */ }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// Helper: fetch data with silent error handling
// ─────────────────────────────────────────────────────────────────
const safe = <T,>(result: PromiseSettledResult<T>): T | null =>
    result.status === 'fulfilled' ? result.value : null

const isRevenueStatus = (s?: string | null) => REVENUE_STATUSES.includes(String(s ?? '').trim())

// ─────────────────────────────────────────────────────────────────
// Helper: Fetch financials directly from DB (bypass fragile RPC)
// Uses shared REVENUE_STATUSES (includes Verified/Billed/Paid) + Thai month.
// ─────────────────────────────────────────────────────────────────
async function getFinancialDirect(branchId?: string) {
    try {
        const supabase = await createAdminClient()
        const { start, end } = getThaiMonthBoundaries()
        const firstDay = formatDateSafe(start)!
        const lastDay = formatDateSafe(end)!

        let query = supabase
            .from('Jobs_Main')
            .select('Price_Cust_Total, Cost_Driver_Total, Price_Cust_Extra, Cost_Driver_Extra, Job_Status')
            .gte('Plan_Date', firstDay)
            .lte('Plan_Date', lastDay)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data } = await query
        if (!data) return null

        const revenueJobs = data.filter((j: { Job_Status?: string | null }) => isRevenueStatus(j.Job_Status))

        const revenue = revenueJobs.reduce((s: number, j: { Price_Cust_Total?: number | null; Price_Cust_Extra?: number | null }) => s + (Number(j.Price_Cust_Total) || 0) + (Number(j.Price_Cust_Extra) || 0), 0)
        const cost = revenueJobs.reduce((s: number, j: { Cost_Driver_Total?: number | null; Cost_Driver_Extra?: number | null }) => s + (Number(j.Cost_Driver_Total) || 0) + (Number(j.Cost_Driver_Extra) || 0), 0)
        const netProfit = revenue - cost
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

        // Total jobs pipeline this month (for context)
        const pipeline = data.reduce((s: number, j: { Price_Cust_Total?: number | null }) => s + (Number(j.Price_Cust_Total) || 0), 0)

        return { revenue, cost, netProfit, margin, pipeline, jobCount: data.length, revenueJobCount: revenueJobs.length }
    } catch {
        return null
    }
}

// ─────────────────────────────────────────────────────────────────
// Helper: Fetch today's jobs directly (Thai timezone)
// ─────────────────────────────────────────────────────────────────
async function getTodayDirect(branchId?: string) {
    try {
        const supabase = await createAdminClient()
        const today = formatDateSafe(getThaiNow())!

        let query = supabase
            .from('Jobs_Main')
            .select('Job_ID, Job_Status, Customer_Name, Driver_Name, Vehicle_Plate, Route_Name, Origin_Location, Dest_Location, Plan_Date')
            .eq('Plan_Date', today)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data } = await query.order('Created_At', { ascending: false }).limit(30)
        if (!data) return null

        const active = data.filter((j: { Job_Status?: string | null }) => ['Picked Up', 'In Transit', 'Assigned', 'Confirmed', 'Arrived'].includes(j.Job_Status || '')).length
        const completed = data.filter((j: { Job_Status?: string | null }) => isRevenueStatus(j.Job_Status)).length
        const pending = data.filter((j: { Job_Status?: string | null }) => ['New', 'Pending', 'Requested', 'Draft'].includes(j.Job_Status || '')).length
        const sos = data.filter((j: { Job_Status?: string | null }) => j.Job_Status === 'SOS').length

        return {
            total: data.length,
            active,
            completed,
            pending,
            sos,
            jobs: data.slice(0, 10).map((j: { Job_ID: string; Job_Status: string; Customer_Name?: string | null; Driver_Name?: string | null; Vehicle_Plate?: string | null; Route_Name?: string | null; Origin_Location?: string | null; Dest_Location?: string | null }) => ({
                id: j.Job_ID,
                status: j.Job_Status,
                customer: j.Customer_Name,
                driver: j.Driver_Name,
                plate: j.Vehicle_Plate,
                route: j.Route_Name,
                origin: j.Origin_Location,
                dest: j.Dest_Location
            }))
        }
    } catch {
        return null
    }
}

// ─────────────────────────────────────────────────────────────────
// Helper: Fetch customers directly
// ─────────────────────────────────────────────────────────────────
async function getCustomersDirect(branchId?: string) {
    try {
        const supabase = await createAdminClient()
        let query = supabase
            .from('Master_Customers')
            .select('Customer_ID, Customer_Name, Contact_Person, Phone_No, Branch_ID, Active_Status')

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data } = await query.limit(50)
        return data || []
    } catch {
        return []
    }
}

// ─────────────────────────────────────────────────────────────────
// Helper: Fetch recent job history for trend analysis (Thai timezone)
// ─────────────────────────────────────────────────────────────────
async function getRecentJobTrend(branchId?: string) {
    try {
        const supabase = await createAdminClient()
        const now = getThaiNow()
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 6)
        const startDate = formatDateSafe(sevenDaysAgo)!

        let query = supabase
            .from('Jobs_Main')
            .select('Plan_Date, Job_Status, Price_Cust_Total, Customer_Name, Route_Name')
            .gte('Plan_Date', startDate)

        if (branchId && branchId !== 'All') {
            query = query.eq('Branch_ID', branchId)
        }

        const { data } = await query.order('Plan_Date', { ascending: true }).limit(300)
        if (!data) return []

        // Group by date
        const byDate: Record<string, { date: string, total: number, completed: number, revenue: number }> = {}
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo)
            d.setDate(sevenDaysAgo.getDate() + i)
            const ds = formatDateSafe(d)!
            byDate[ds] = { date: ds, total: 0, completed: 0, revenue: 0 }
        }

        data.forEach((j: { Plan_Date?: string | null, Job_Status?: string | null, Price_Cust_Total?: number | null }) => {
            const ds = String(j.Plan_Date).split('T')[0]
            if (byDate[ds]) {
                byDate[ds].total++
                if (isRevenueStatus(j.Job_Status)) {
                    byDate[ds].completed++
                    byDate[ds].revenue += Number(j.Price_Cust_Total) || 0
                }
            }
        })

        return Object.values(byDate)
    } catch {
        return []
    }
}

// ─────────────────────────────────────────────────────────────────
// Helper: Fetch billing/invoice summary
// ─────────────────────────────────────────────────────────────────
async function getBillingSummary() {
    try {
        const supabase = await createAdminClient()
        const { data } = await supabase
            .from('Billing_Notes')
            .select('Status, Total_Amount, Created_At')
            .limit(100)
            .order('Created_At', { ascending: false })

        if (!data) return null

        const pending = data.filter((b: { Status?: string | null }) => ['Draft', 'Pending', 'Sent'].includes(b.Status || ''))
        const paid = data.filter((b: { Status?: string | null }) => b.Status === 'Paid')

        return {
            total: data.length,
            pending: pending.length,
            paid: paid.length,
            pendingAmount: pending.reduce((s: number, b: { Total_Amount?: number | null }) => s + (Number(b.Total_Amount) || 0), 0),
            paidAmount: paid.reduce((s: number, b: { Total_Amount?: number | null }) => s + (Number(b.Total_Amount) || 0), 0),
        }
    } catch {
        return null
    }
}

// ─────────────────────────────────────────────────────────────────
// Knowledge base with a short in-memory cache (per branch, 45s TTL)
// so we don't hammer the DB with ~14 queries on every single message.
// ─────────────────────────────────────────────────────────────────
type KnowledgeBase = Awaited<ReturnType<typeof buildKnowledgeBase>>
const kbCache = new Map<string, { at: number, data: KnowledgeBase }>()
const KB_TTL_MS = 45_000

async function buildKnowledgeBase(branchId?: string) {
    const [
        todayData, financialData, allDrivers, allVehicles, maintenanceStats,
        pendingRepairs, fuelAnalytics, fleetHealth, damageReports, driverLeaves,
        customers, jobTrend, billing, workforceAnalytics,
    ] = await Promise.allSettled([
        getTodayDirect(branchId),
        getFinancialDirect(branchId),
        aiToolExecutors.get_all_drivers(),
        aiToolExecutors.get_all_vehicles(),
        aiToolExecutors.get_maintenance_stats(),
        aiToolExecutors.get_pending_repairs(),
        aiToolExecutors.get_fuel_analytics(),
        aiToolExecutors.get_fleet_health(),
        aiToolExecutors.get_damage_reports(),
        aiToolExecutors.get_driver_leaves({}),
        getCustomersDirect(branchId),
        getRecentJobTrend(branchId),
        getBillingSummary(),
        aiToolExecutors.get_workforce_analytics(),
    ])

    return {
        today: safe(todayData),
        fin: safe(financialData),
        drivers: safe(allDrivers) as { id?: string; name?: string; status?: string }[] | null,
        vehicles: safe(allVehicles) as { plate?: string; type?: string; status?: string }[] | null,
        maintStats: safe(maintenanceStats),
        repairs: safe(pendingRepairs) as { vehicle?: string; problem?: string; status?: string }[] | null,
        fuel: safe(fuelAnalytics) as { totalFuelCost?: number; totalLiters?: number; avgPerTrip?: number } | null,
        health: safe(fleetHealth) as { severity?: string; vehicle?: string; alert?: string }[] | null,
        damage: safe(damageReports) as { driver?: string; description?: string; amount?: number; status?: string }[] | null,
        leaves: safe(driverLeaves) as { driver?: string; type?: string; from?: string; to?: string; status?: string }[] | null,
        custList: safe(customers) as { id?: string; Customer_ID?: string; name?: string; Customer_Name?: string }[] | null,
        trend: safe(jobTrend) as { date: string; total: number; completed: number; revenue: number }[] | null,
        bill: safe(billing),
        workforce: safe(workforceAnalytics),
    }
}

async function getKnowledgeBase(branchId?: string): Promise<KnowledgeBase> {
    const key = branchId || 'All'
    const cached = kbCache.get(key)
    if (cached && Date.now() - cached.at < KB_TTL_MS) return cached.data
    const data = await buildKnowledgeBase(branchId)
    kbCache.set(key, { at: Date.now(), data })
    return data
}

// ─────────────────────────────────────────────────────────────────
// RAG: embed the user's question (Gemini) and pull semantically-similar
// customers/locations. Degrades silently if the table/RPC isn't set up
// yet or nothing is indexed.
// ─────────────────────────────────────────────────────────────────
async function getRagContext(message: string, branchId?: string): Promise<string> {
    try {
        const queryEmbedding = await embedGemini(message)
        const supabase = await createAdminClient()
        const { data, error } = await supabase.rpc('match_ai_embeddings_gemini', {
            query_embedding: queryEmbedding,
            match_count: 6,
            filter_branch: branchId ?? null,
            filter_type: null,
        })
        if (error || !Array.isArray(data) || data.length === 0) return ''
        const lines = (data as { content: string; similarity: number }[])
            .filter(r => r.similarity > 0.5)
            .map(r => `  • ${r.content}`)
        if (lines.length === 0) return ''
        return `\n\n═══ 🔎 ข้อมูลที่เกี่ยวข้องกับคำถาม (semantic search) ═══\n${lines.join('\n')}`
    } catch {
        return ''
    }
}

function buildSystemPrompt(kb: KnowledgeBase, username: string, branchId?: string, ragContext = ''): string {
    const { today, fin, drivers, vehicles, maintStats, repairs, fuel, health, damage, leaves, custList, trend, bill, workforce } = kb
    const now = getThaiNow().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

    return `
คุณคือ "LogisPro AI" ผู้ช่วยอัจฉริยะของระบบบริหารการขนส่ง สามารถตอบคำถามได้อย่างยืดหยุ่น ไม่จำเป็นต้องพิมพ์คำถามเป๊ะๆ
วันที่และเวลาปัจจุบัน: ${now}
ผู้ใช้งาน: ${username || 'Admin'} | สาขา: ${branchId || 'ทุกสาขา'}

═══ 📦 งานวันนี้ ═══
- จำนวนงานทั้งหมดวันนี้: ${today?.total ?? 'ไม่มีข้อมูล'} รายการ
- กำลังดำเนินการ / วิ่งอยู่: ${today?.active ?? 0} คัน
- เสร็จสิ้นแล้ว: ${today?.completed ?? 0} รายการ
- รอดำเนินการ: ${today?.pending ?? 0} รายการ
- SOS/ฉุกเฉิน: ${today?.sos ?? 0} คัน
- รายการงานวันนี้: ${JSON.stringify(today?.jobs ?? [])}

═══ 📈 แนวโน้ม 7 วันที่ผ่านมา ═══
${(trend || []).map((t) => `  ${t.date}: งาน ${t.total} รายการ, เสร็จ ${t.completed}, รายได้ ฿${t.revenue?.toLocaleString()}`).join('\n') || 'ไม่มีข้อมูล'}

═══ 💰 การเงินเดือนนี้ (นับงานสถานะ Completed/Delivered/Verified/Billed/Paid) ═══
- รายได้จากงานที่ส่ง/ยืนยันแล้ว: ฿${fin?.revenue?.toLocaleString() ?? 'ไม่มีข้อมูล'}
- ยอดรวมทุกงาน (Pipeline): ฿${fin?.pipeline?.toLocaleString() ?? 'ไม่มีข้อมูล'}
- ต้นทุนคนขับรวม: ฿${fin?.cost?.toLocaleString() ?? 'ไม่มีข้อมูล'}
- กำไรสุทธิ: ฿${fin?.netProfit?.toLocaleString() ?? 'ไม่มีข้อมูล'}
- อัตรากำไร: ${fin?.margin?.toFixed(1) ?? 'ไม่มีข้อมูล'}%
- จำนวนงานที่นับรายได้แล้ว: ${fin?.revenueJobCount ?? 0} / ${fin?.jobCount ?? 0} รายการ

═══ 📋 Billing/ใบวางบิล ═══
- ใบวางบิลทั้งหมด: ${bill?.total ?? 0} ใบ
- รอชำระ: ${bill?.pending ?? 0} ใบ (฿${bill?.pendingAmount?.toLocaleString() ?? 0})
- ชำระแล้ว: ${bill?.paid ?? 0} ใบ (฿${bill?.paidAmount?.toLocaleString() ?? 0})

═══ 👥 ลูกค้า ═══
- จำนวนลูกค้าในระบบ: ${custList?.length ?? 0} ราย
- รายชื่อลูกค้า (สูงสุด 15 ราย): ${custList?.slice(0, 15).map((c) => `${c.name || c.Customer_Name} (${c.id || c.Customer_ID})`).join(', ') ?? 'ไม่มีข้อมูล'}

═══ 👨‍✈️ คนขับ ═══
- จำนวนคนขับทั้งหมด: ${drivers?.length ?? 0} คน
- Active: ${drivers?.filter((d) => d.status === 'Active').length ?? 0} คน
- รายชื่อ (10 คนแรก): ${drivers?.slice(0, 10).map((d) => `${d.name} (${d.id}) - ${d.status}`).join(', ') ?? 'ไม่มีข้อมูล'}

═══ 🚛 ยานพาหนะ ═══
- จำนวนรถทั้งหมด: ${vehicles?.length ?? 0} คัน
- Active: ${vehicles?.filter((v) => v.status === 'Active').length ?? 0} คัน
- ทะเบียน (10 คันแรก): ${vehicles?.slice(0, 10).map((v) => `${v.plate} (${v.type || '-'})`).join(', ') ?? 'ไม่มีข้อมูล'}

═══ 🔧 ซ่อมบำรุง ═══
- สรุปภาพรวม: ${JSON.stringify(maintStats ?? {})}
- รอซ่อม: ${repairs?.length ?? 0} รายการ
- รายการซ่อม: ${repairs?.slice(0, 5).map((r) => `${r.vehicle}: ${r.problem} (${r.status})`).join(' | ') ?? 'ไม่มีรายการซ่อม'}

═══ ⛽ น้ำมัน ═══
- ค่าน้ำมันรวม: ฿${fuel?.totalFuelCost?.toLocaleString() ?? 'ไม่มีข้อมูล'}
- ปริมาณน้ำมัน: ${fuel?.totalLiters?.toLocaleString() ?? 0} ลิตร
- เฉลี่ยต่อเที่ยว: ${fuel?.avgPerTrip?.toFixed(1) ?? 0} ลิตร

═══ 🚨 Fleet Health ═══
- แจ้งเตือน: ${health?.length ?? 0} รายการ
- รายละเอียด: ${health?.slice(0, 3).map((h) => `[${h.severity}] ${h.vehicle}: ${h.alert}`).join(' | ') ?? 'ไม่มีการแจ้งเตือน'}

═══ 💥 สินค้าเสียหาย ═══
- รายการทั้งหมด: ${damage?.length ?? 0} รายการ
- รอตรวจสอบ: ${damage?.filter((d) => d.status === 'Pending').length ?? 0} รายการ
- รายละเอียด: ${damage?.slice(0, 3).map((d) => `${d.driver}: ${d.description} (฿${d.amount})`).join(' | ') ?? 'ไม่มี'}

═══ 📅 การลา ═══
- การลาเดือนนี้: ${leaves?.length ?? 0} รายการ
- รออนุมัติ: ${leaves?.filter((l) => l.status === 'Pending').length ?? 0} รายการ
- รายละเอียด: ${leaves?.slice(0, 5).map((l) => `${l.driver}: ${l.type} (${l.from} - ${l.to})`).join(' | ') ?? 'ไม่มี'}

═══ 📊 Workforce ═══
${JSON.stringify(workforce ?? {})}
${ragContext}

═══ 📌 แนวทางตอบคำถาม ═══
- ตอบเป็นภาษาไทยอย่างเป็นธรรมชาติ กระชับ และมืออาชีพ
- เข้าใจคำถามที่หลากหลาย เช่น "วันนี้เป็นยังไงบ้าง", "มีปัญหาอะไรมั้ย", "กำไรเดือนนี้เท่าไหร่", "รถคันไหนส่งแล้ว"
- สามารถวิเคราะห์แนวโน้ม เปรียบเทียบ หรือเสนอคำแนะนำได้ และอ้างอิงบทสนทนาก่อนหน้าได้
- ถ้าข้อมูลบางส่วนเป็น 0 หรือน้อยมาก ให้บอกผู้ใช้ว่าอาจยังไม่มีงานในช่วงนั้น หรือข้อมูลยังไม่ถูก update
- ถ้าถามเรื่องที่ไม่มีในฐานข้อมูล ให้บอกตรงๆ ว่าไม่มีข้อมูล
    `.trim()
}

// ─────────────────────────────────────────────────────────────────
// SafeMode fallback (no keyword-perfect matching required)
// ─────────────────────────────────────────────────────────────────
function buildSafeResponse(message: string, kb: KnowledgeBase, debugNote: string): string {
    const { today, fin, drivers, vehicles, repairs, fuel, leaves, damage, custList, bill } = kb
    const lower = String(message).toLowerCase()
    const has = (...words: string[]) => words.some(w => lower.includes(w))

    let r = `🤖 ระบบ AI หลักขัดข้องชั่วคราว แต่ยังมีข้อมูลพื้นฐานให้ครับ${debugNote}`

    if (has('งาน', 'job', 'วันนี้', 'ส่งของ', 'ขนส่ง', 'เที่ยว', 'trip', 'delivery')) {
        r = `📦 งานวันนี้รวม ${today?.total ?? 0} รายการ | กำลังวิ่ง ${today?.active ?? 0} คัน | เสร็จแล้ว ${today?.completed ?? 0} รายการ | รอ ${today?.pending ?? 0} รายการ`
    } else if (has('รายได้', 'กำไร', 'เงิน', 'revenue', 'profit', 'การเงิน', 'ยอด', 'ราคา')) {
        r = `💰 รายได้เดือนนี้: ฿${fin?.revenue?.toLocaleString() ?? 0} | กำไร: ฿${fin?.netProfit?.toLocaleString() ?? 0} | Margin: ${fin?.margin?.toFixed(1) ?? 0}%`
    } else if (has('คนขับ', 'driver', 'พนักงาน', 'ขับ')) {
        r = `👨‍✈️ คนขับ ${drivers?.length ?? 0} คน | Active: ${drivers?.filter((d) => d.status === 'Active').length ?? 0} คน`
    } else if (has('รถ', 'vehicle', 'ยานพาหนะ', 'ทะเบียน', 'fleet')) {
        r = `🚛 รถทั้งหมด ${vehicles?.length ?? 0} คัน | Active: ${vehicles?.filter((v) => v.status === 'Active').length ?? 0} คัน`
    } else if (has('ซ่อม', 'maintenance', 'บำรุง', 'repair')) {
        r = `🔧 รอซ่อม ${repairs?.length ?? 0} รายการ`
    } else if (has('น้ำมัน', 'fuel', 'เติม')) {
        r = `⛽ ค่าน้ำมันรวม: ฿${fuel?.totalFuelCost?.toLocaleString() ?? 0} | ${fuel?.totalLiters?.toLocaleString() ?? 0} ลิตร`
    } else if (has('ลา', 'leave', 'หยุด', 'วันหยุด')) {
        r = `📅 การลา ${leaves?.length ?? 0} รายการ | รออนุมัติ ${leaves?.filter((l) => l.status === 'Pending').length ?? 0} รายการ`
    } else if (has('เสียหาย', 'damage', 'แตก', 'หัก', 'สินค้า')) {
        r = `💥 รายงานเสียหาย ${damage?.length ?? 0} รายการ | รอตรวจสอบ ${damage?.filter((d) => d.status === 'Pending').length ?? 0} รายการ`
    } else if (has('ลูกค้า', 'customer', 'บริษัท')) {
        r = `👥 ลูกค้าในระบบ ${custList?.length ?? 0} ราย`
    } else if (has('billing', 'บิล', 'ใบวางบิล', 'invoice', 'ชำระ')) {
        r = `📋 ใบวางบิล ${bill?.total ?? 0} ใบ | รอชำระ ${bill?.pending ?? 0} ใบ (฿${bill?.pendingAmount?.toLocaleString() ?? 0}) | ชำระแล้ว ${bill?.paid ?? 0} ใบ`
    } else if (has('สรุป', 'ภาพรวม', 'summary', 'report', 'ทั้งหมด', 'overview')) {
        r = `📊 สรุปวันนี้: งาน ${today?.total ?? 0} รายการ | รายได้ ฿${fin?.revenue?.toLocaleString() ?? 0} | รถ ${vehicles?.length ?? 0} คัน | คนขับ ${drivers?.length ?? 0} คน | รอซ่อม ${repairs?.length ?? 0} คัน`
    }
    return `[SafeMode] ${r}`
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { message } = body
        const history: ChatMsg[] = Array.isArray(body.history) ? body.history : []
        // Streaming is opt-in: chat UIs pass stream:true; server-to-server
        // callers (LINE webhook, etc.) get plain JSON { response }.
        const wantStream = body.stream === true
        if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ response: "AI System: ไม่พบ API Key ในการตั้งค่าระบบ" })
        }

        const userBranchId = await getUserBranchId()
        const branchId = (userBranchId && userBranchId !== 'All') ? userBranchId : undefined

        // 1. Knowledge base (cached per branch for 45s) + RAG retrieval
        const [kb, ragContext] = await Promise.all([
            getKnowledgeBase(branchId),
            getRagContext(message, branchId),
        ])
        const systemPrompt = buildSystemPrompt(kb, session.username, branchId, ragContext)
        const userTurn = `คำถาม: ${message}`

        // 2. Stream from Gemini, falling through models on HTTP errors
        const allErrors: string[] = []
        for (const modelName of GEMINI_MODELS) {
            try {
                const res = await callGeminiStream(apiKey, modelName, systemPrompt, history, userTurn)
                if (!res.ok || !res.body) {
                    const errBody = await res.text().catch(() => '')
                    allErrors.push(`[${modelName}] HTTP ${res.status}: ${errBody.slice(0, 120)}`)
                    continue
                }

                // Non-streaming callers: accumulate full text -> JSON
                if (!wantStream) {
                    let full = ''
                    try { for await (const text of parseGeminiSSE(res.body)) full += text } catch { /* ignore */ }
                    if (!full) full = buildSafeResponse(message, kb, '')
                    return NextResponse.json({ response: full })
                }

                // Streaming callers: transform Gemini SSE -> plain text stream
                const encoder = new TextEncoder()
                const stream = new ReadableStream<Uint8Array>({
                    async start(controller) {
                        let emitted = false
                        try {
                            for await (const text of parseGeminiSSE(res.body!)) {
                                emitted = true
                                controller.enqueue(encoder.encode(text))
                            }
                            if (!emitted) controller.enqueue(encoder.encode(buildSafeResponse(message, kb, '')))
                        } catch {
                            if (!emitted) controller.enqueue(encoder.encode(buildSafeResponse(message, kb, '')))
                        } finally {
                            controller.close()
                        }
                    }
                })

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                    },
                })
            } catch (err: unknown) {
                allErrors.push(`[${modelName}] ${(err as Error).message || String(err)}`)
                continue
            }
        }

        // 3. All models failed -> SafeMode (non-streamed JSON)
        const lastError = allErrors.join(' | ')
        console.error(`[AI Chat] All models failed: ${lastError}`)
        const debugNote = lastError ? `\n\n⚠️ [Debug] AI Error: ${lastError.slice(0, 120)}` : ''
        return NextResponse.json({ response: buildSafeResponse(message, kb, debugNote) })

    } catch (error: unknown) {
        console.error('[AI Chat] Critical Error:', error)
        return NextResponse.json({
            response: `ระบบ AI ขัดข้อง: [${error instanceof Error ? error.message : String(error)}]`
        })
    }
}
