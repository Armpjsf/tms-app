import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { replyToUser, verifyLineSignature, getMessageContent, pushToUser } from '@/lib/integrations/line'
import { aiToolExecutors } from '@/lib/ai/tools'

// ─────────────────────────────────────────────────────────────────
// Models (same as /api/chat) - Direct REST, no SDK
// ─────────────────────────────────────────────────────────────────
const GEMINI_MODELS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-2.0-flash-exp",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite-preview",
]

// LINE has 2000 char limit per bubble — split smartly
function splitLineMessage(text: string, maxLen = 1900): string[] {
    if (text.length <= maxLen) return [text]
    const parts: string[] = []
    let remaining = text
    while (remaining.length > maxLen) {
        // Try to split at newline near the limit
        let cut = remaining.lastIndexOf('\n', maxLen)
        if (cut < maxLen * 0.5) cut = remaining.lastIndexOf(' ', maxLen)
        if (cut < 1) cut = maxLen
        parts.push(remaining.slice(0, cut).trimEnd())
        remaining = remaining.slice(cut).trimStart()
    }
    if (remaining) parts.push(remaining)
    return parts
}

// ─────────────────────────────────────────────────────────────────
// Direct REST call to Gemini (text)
// ─────────────────────────────────────────────────────────────────
async function callGeminiText(systemPrompt: string, userMessage: string): Promise<{ text: string | null, error: string }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return { text: null, error: 'NO_API_KEY' }

    const errors: string[] = []
    for (const modelName of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nคำถาม/คำสั่ง: ${userMessage}` }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
                }),
                signal: AbortSignal.timeout(15000)
            })
            if (!res.ok) {
                const errBody = await res.text().catch(() => '')
                const msg = `${modelName}:HTTP${res.status}:${errBody.slice(0, 120)}`
                errors.push(msg)
                console.warn(`[Line AI] ${msg}`)
                continue
            }
            const data = await res.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
                console.log(`[Line AI] Success with: ${modelName}`)
                return { text, error: '' }
            }
            errors.push(`${modelName}:EMPTY_RESPONSE`)
        } catch (err: any) {
            const msg = `${modelName}:${err.message}`
            errors.push(msg)
            console.warn(`[Line AI] ${msg}`)
            continue
        }
    }
    return { text: null, error: errors.join(' | ') }
}

// ─────────────────────────────────────────────────────────────────
// Gemini Multimodal REST call (image / audio)
// ─────────────────────────────────────────────────────────────────
async function callGeminiMultimodal(
    systemPrompt: string,
    prompt: string,
    mimeType: string,
    data: Buffer
): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return null

    // Only multimodal-capable models
    const MULTI_MODELS = ["gemini-2.5-flash-preview-04-17", "gemini-2.5-flash", "gemini-2.0-flash"]

    for (const modelName of MULTI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            { inlineData: { mimeType, data: data.toString('base64') } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: { temperature: 0.5, maxOutputTokens: 800 }
                }),
                signal: AbortSignal.timeout(20000)
            })
            if (!res.ok) {
                console.warn(`[Line Multimodal] ${modelName} HTTP ${res.status}`)
                continue
            }
            const json = await res.json()
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) return text
        } catch (err: any) {
            console.warn(`[Line Multimodal] ${modelName} failed: ${err.message}`)
            continue
        }
    }
    return null
}

// ─────────────────────────────────────────────────────────────────
// Build AI System Prompt with operational data
// ─────────────────────────────────────────────────────────────────
async function buildAIContext(branchId?: string, userName: string = 'ผู้ใช้'): Promise<string> {
    const results = await Promise.allSettled([
        aiToolExecutors.get_today_summary({ branchId }),
        aiToolExecutors.get_financial_summary({ branchId }),
        aiToolExecutors.get_all_drivers(),
        aiToolExecutors.get_all_vehicles(),
        aiToolExecutors.get_maintenance_stats(),
        aiToolExecutors.get_pending_repairs(),
        aiToolExecutors.get_fuel_analytics(),
        aiToolExecutors.get_damage_reports(),
        aiToolExecutors.get_driver_leaves({}),
    ])

    const safe = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
    const [todaySummary, financial, allDrivers, allVehicles, maintStats, pendingRepairs, fuel, damage, leaves] = results

    const today = safe(todaySummary)
    const fin = safe(financial)
    const drivers = safe(allDrivers) as any[] | null
    const vehicles = safe(allVehicles) as any[] | null
    const repairs = safe(pendingRepairs) as any[] | null
    const fuelData = safe(fuel)
    const damageData = safe(damage) as any[] | null
    const leavesData = safe(leaves) as any[] | null

    const now = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
    })

    return `
คุณคือ "LogisPro AI" ผู้ช่วยระบบ TMS ส่งคำตอบผ่าน LINE
เวลา: ${now} | ผู้ใช้: ${userName} | สาขา: ${branchId || 'ทุกสาขา'}

❗ กฎ: ตอบภาษาไทย กระชับแต่ครบถ้วน ใช้ Emoji ประกอบ เสร็จประโยคทุกครั้ง ห้ามตัดประโยคกลางคำ

📦 งานวันนี้: ${today?.todayJobCount ?? 0} รายการ | วิ่ง: ${today?.stats?.active ?? 0} | เสร็จ: ${today?.stats?.completed ?? 0} | รอ: ${today?.stats?.pending ?? 0}
💰 รายได้: ฿${fin?.revenue?.toLocaleString() ?? 0} | กำไร: ฿${fin?.netProfit?.toLocaleString() ?? 0} (${fin?.margin?.toFixed(1) ?? 0}%)
👨‍✈️ คนขับ: ${drivers?.length ?? 0} คน (Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0})
🚛 รถ: ${vehicles?.length ?? 0} คัน (Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0})
🔧 รอซ่อม: ${repairs?.length ?? 0} รายการ
⛽ น้ำมัน: ฿${fuelData?.totalFuelCost?.toLocaleString() ?? 0} (${fuelData?.totalLiters?.toFixed(0) ?? 0} ลิตร)
💥 เสียหาย: ${damageData?.length ?? 0} รายการ
📅 การลา: ${leavesData?.length ?? 0} รายการ (รออนุมัติ: ${leavesData?.filter((l: any) => l.status === 'Pending').length ?? 0})
`.trim()
}

// ─────────────────────────────────────────────────────────────────
// LINE Chatbot Webhook
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text()
        const signature = req.headers.get('x-line-signature') || ''

        if (!verifyLineSignature(bodyText, signature)) {
            console.warn('[Line] Unauthorized webhook attempt')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const body = JSON.parse(bodyText)
        const events = body.events || []
        const supabase = createAdminClient()

        for (const event of events) {
            const replyToken = event.replyToken
            const userId = event.source?.userId
            if (!replyToken || !userId) continue

            // ── Identify user ──────────────────────────────────────────────
            const [{ data: boundCustomer }, { data: boundDriver }, { data: boundAdmin }] = await Promise.all([
                supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Line_User_ID', userId).maybeSingle(),
                supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate').eq('Line_User_ID', userId).maybeSingle(),
                supabase.from('Master_Users').select('Username, Name, Role, Role_ID, Branch_ID').eq('Line_User_ID', userId).maybeSingle(),
            ])

            const userName = boundAdmin?.Name || boundDriver?.Driver_Name || boundCustomer?.Customer_Name || 'ผู้ใช้'
            const branchId = boundAdmin?.Branch_ID || undefined

            // ─────────────────────────────────────────────────────────────
            // TEXT MESSAGE
            // ─────────────────────────────────────────────────────────────
            if (event.type === 'message' && event.message?.type === 'text') {
                const rawText = (event.message.text || '').trim()
                const text = rawText.toUpperCase()

                // 1. HELP / MENU
                if (['HELP', 'MENU', 'เมนู', 'ช่วยเหลือ'].includes(text)) {
                    await replyToUser(replyToken, [
                        '🤖 LogisPro AI — คำสั่งที่ใช้ได้',
                        '',
                        '📌 ทั่วไป',
                        '  BIND [รหัส] [เบอร์โทร] — ผูกบัญชี',
                        '  HELP / MENU — แสดงเมนูนี้',
                        '',
                        '👨‍✈️ คนขับ',
                        '  งาน / WORK — ดูงานของฉัน',
                        '  [เลขงาน] START — เริ่มงาน',
                        '',
                        '📊 คำสั่งด่วน (ไม่ต้องใช้ AI)',
                        '  - งานวันนี้ / สรุปงาน',
                        '  - รายได้ / กำไร (Admin)',
                        '  - รถเสีย / แจ้งซ่อม',
                        '  - สุขภาพรถ / fleet',
                        '  - ค่าน้ำมัน',
                        '  - คนขับลา',
                        '  - JOB-[เลขงาน] — เช็คสถานะงาน',
                        '',
                        '🤖 AI (ผูกบัญชีแล้ว)',
                        '  ถามได้อิสระ เช่น "มีใครลามั่ง", "กำไรดีไหม"',
                    ].join('\n'))
                    continue
                }

                // 2. BIND
                if (text.startsWith('BIND ')) {
                    const parts = rawText.split(' ')
                    if (parts.length < 3) {
                        await replyToUser(replyToken, 'รูปแบบไม่ถูกต้อง\nกรุณาพิมพ์: BIND [รหัส] [เบอร์โทร]')
                        continue
                    }
                    const id = parts[1]
                    const phone = parts[2]

                    // Customer
                    const { data: customer } = await supabase.from('Master_Customers')
                        .select('Customer_ID, Customer_Name').eq('Customer_ID', id).eq('Phone', phone).maybeSingle()
                    if (customer) {
                        await supabase.from('Master_Customers').update({ Line_User_ID: userId }).eq('Customer_ID', id)
                        await replyToUser(replyToken, `✅ คุณ ${customer.Customer_Name} ผูกบัญชีสำเร็จแล้วครับ!\nพิมพ์ HELP เพื่อดูเมนูได้เลย`)
                        continue
                    }

                    // Driver
                    const { data: driver } = await supabase.from('Master_Drivers')
                        .select('Driver_ID, Driver_Name').eq('Driver_ID', id).eq('Mobile_No', phone).maybeSingle()
                    if (driver) {
                        await supabase.from('Master_Drivers').update({ Line_User_ID: userId }).eq('Driver_ID', id)
                        await replyToUser(replyToken, `✅ คุณ ${driver.Driver_Name} (คนขับ) ผูกบัญชีสำเร็จแล้วครับ!\nพิมพ์ "งาน" เพื่อดูงานของคุณ`)
                        continue
                    }

                    // Admin (any user in Master_Users)
                    const { data: allAdminMatches } = await supabase.from('Master_Users')
                        .select('Username, Name, Role, Role_ID, Email')
                        .or(`Username.ilike.%${id}%,Email.ilike.%${id}%`)
                        .limit(5)

                    console.log(`[BIND Admin] Search "${id}" → found ${allAdminMatches?.length ?? 0}:`, allAdminMatches?.map(u => u.Username))

                    const adminUser = allAdminMatches?.[0] ?? null

                    if (adminUser && phone.toUpperCase() === 'ADMIN') {
                        await supabase.from('Master_Users').update({ Line_User_ID: userId }).eq('Username', adminUser.Username)
                        await replyToUser(replyToken, `✅ ยินดีต้อนรับคุณ ${adminUser.Name}!\nRole: ${adminUser.Role}\nผูกบัญชีสำเร็จแล้วครับ 🎉`)
                        continue
                    }

                    // Debug: show what was found vs not
                    if (allAdminMatches && allAdminMatches.length > 0 && phone.toUpperCase() !== 'ADMIN') {
                        await replyToUser(replyToken, `พบผู้ใช้ "${allAdminMatches[0].Name}" ในระบบ\nแต่ต้องพิมพ์ ADMIN ต่อท้ายครับ\nตัวอย่าง: BIND ${id} ADMIN`)
                    } else {
                        await replyToUser(replyToken, `❌ ไม่พบผู้ใช้ "${id}" ในระบบ\nลองใช้ Email หรือ Username ที่ถูกต้องครับ\nรูปแบบ: BIND [username/email] ADMIN`)
                    }
                    continue
                }

                // 3. Driver shortcuts
                if (boundDriver) {
                    if (text === 'WORK' || text === 'งาน') {
                        const { data: jobs } = await supabase.from('Jobs_Main')
                            .select('Job_ID, Job_Status, Route_Name, Customer_Name')
                            .eq('Driver_ID', boundDriver.Driver_ID)
                            .not('Job_Status', 'in', '("Completed","Delivered","Cancelled")')
                            .order('Plan_Date', { ascending: true })
                            .limit(5)

                        if (!jobs?.length) {
                            await replyToUser(replyToken, `📭 คุณ ${boundDriver.Driver_Name}\nไม่มีงานค้างในระบบครับ`)
                        } else {
                            const lines = [`📋 งานของคุณ ${boundDriver.Driver_Name}:\n`]
                            jobs.forEach((j, i) => lines.push(
                                `${i + 1}. ${j.Job_ID}\n   👤 ${j.Customer_Name}\n   🗺️ ${j.Route_Name}\n   📍 ${j.Job_Status}\n   ➡️ พิมพ์: ${j.Job_ID} START`
                            ))
                            await replyToUser(replyToken, lines.join('\n\n'))
                        }
                        continue
                    }

                    if (text.includes(' START') || text.includes(' เริ่ม')) {
                        const jobId = rawText.split(' ')[0].toUpperCase()
                        const { error } = await supabase.from('Jobs_Main')
                            .update({ Job_Status: 'In Progress' })
                            .eq('Job_ID', jobId)
                            .eq('Driver_ID', boundDriver.Driver_ID)
                        await replyToUser(replyToken, error
                            ? `❌ ไม่สามารถเริ่มงานได้: ${error.message}`
                            : `✅ เริ่มงาน ${jobId} เรียบร้อยครับ!\n🚛 ขอให้เดินทางปลอดภัย`)
                        continue
                    }
                }

                // 4. Job lookup
                if (text.startsWith('JOB-')) {
                    const { data: job } = await supabase.from('Jobs_Main')
                        .select('Job_ID, Customer_Name, Route_Name, Job_Status, Plan_Date, Driver_Name')
                        .ilike('Job_ID', text.trim())
                        .maybeSingle()
                    if (job) {
                        await replyToUser(replyToken, [
                            `📦 งาน: ${job.Job_ID}`,
                            `👤 ลูกค้า: ${job.Customer_Name}`,
                            `🗺️ เส้นทาง: ${job.Route_Name}`,
                            `👨‍✈️ คนขับ: ${job.Driver_Name || '-'}`,
                            `📅 วันที่: ${job.Plan_Date}`,
                            `📍 สถานะ: ${job.Job_Status}`,
                        ].join('\n'))
                        continue
                    } else {
                        await replyToUser(replyToken, `❌ ไม่พบงาน ${text}`)
                        continue
                    }
                }

                // 4. SMART QUICK COMMANDS (Direct Database - No AI needed)
                if (boundAdmin || boundDriver || boundCustomer) {
                    const userBranchId = boundAdmin?.Branch_ID || boundDriver?.Branch_ID || undefined
                    const userCustomerId = boundCustomer?.Customer_ID || undefined
                    
                    // Simple Branch Detection in text (e.g., "งานวันนี้ สาขา 1")
                    let targetBranchId = userBranchId
                    if (rawText.includes('สาขา')) {
                        const match = rawText.match(/สาขา\s*(\S+)/)
                        if (match) targetBranchId = match[1]
                    }

                    const scopeName = boundCustomer ? `ลูกค้า: ${boundCustomer.Customer_Name}` : (targetBranchId ? `สาขา: ${targetBranchId}` : 'ทุกสาขา')

                    // --- 4.1 Today Jobs ---
                    if (text.includes('งานวันนี้') || text.includes('สรุปงาน') || text === 'TODAY') {
                        const today = await aiToolExecutors.get_today_summary({ branchId: targetBranchId, customerId: userCustomerId })
                        const lines = [
                            `📊 สรุปงานประจำวันที่ ${new Date().toLocaleDateString('th-TH')}`,
                            `📍 ขอบเขต: ${scopeName}`,
                            '',
                            `🚛 กำลังวิ่ง: ${today.stats.active} งาน`,
                            `⏳ รอดำเนินการ: ${today.stats.pending} งาน`,
                            `✅ เสร็จสิ้น: ${today.stats.completed} งาน`,
                            `❌ ยกเลิก: ${today.stats.cancelled} งาน`,
                            '',
                            '📍 5 งานล่าสุด:'
                        ]
                        today.jobs.forEach((j: any) => lines.push(`- ${j.id}: ${j.customer} (${j.status})`))
                        await replyToUser(replyToken, lines.join('\n'))
                        continue
                    }

                    // --- 4.2 Financial (Admin only) ---
                    if ((text.includes('รายได้') || text.includes('กำไร') || text.includes('เงิน')) && boundAdmin) {
                        const fin = await aiToolExecutors.get_financial_summary({ branchId: targetBranchId })
                        await replyToUser(replyToken, [
                            '💰 สรุปสถานะการเงิน (เดือนปัจจุบัน)',
                            `📍 ขอบเขต: ${scopeName}`,
                            '',
                            `💵 รายได้: ฿${fin.revenue?.toLocaleString() ?? 0}`,
                            `💸 ต้นทุน: ฿${fin.cost?.toLocaleString() ?? 0}`,
                            `📈 กำไรสุทธิ: ฿${fin.netProfit?.toLocaleString() ?? 0}`,
                            `📊 Margin: ${fin.margin?.toFixed(1) ?? 0}%`,
                        ].join('\n'))
                        continue
                    }

                    // --- 4.3 Maintenance ---
                    if (text.includes('รถเสีย') || text.includes('แจ้งซ่อม') || text.includes('งานซ่อม')) {
                        const repairs = await aiToolExecutors.get_pending_repairs()
                        const lines = [
                            `🔧 รายการแจ้งซ่อมค้างอยู่ (${repairs.length} รายการ)`,
                            ''
                        ]
                        repairs.slice(0, 10).forEach((t: any) => lines.push(`- ${t.vehicle}: ${t.problem} (${t.status})`))
                        if (repairs.length === 0) lines.push('✅ ไม่มีรายการแจ้งซ่อมค้างครับ')
                        await replyToUser(replyToken, lines.join('\n'))
                        continue
                    }

                    // --- 4.4 Fuel ---
                    if (text.includes('น้ำมัน')) {
                        const fuel = await aiToolExecutors.get_fuel_analytics()
                        await replyToUser(replyToken, [
                            '⛽ สรุปการใช้พลังงาน (Fleet)',
                            `💰 ค่าใช้จ่ายรวม: ฿${fuel.totalFuelCost?.toLocaleString() ?? 0}`,
                            `🛢️ ปริมาณรวม: ${fuel.totalLiters?.toLocaleString() ?? 0} ลิตร`,
                            `📈 เฉลี่ยต่อทริป: ${fuel.avgPerTrip?.toFixed(2) ?? 0} กม./ลิตร`,
                        ].join('\n'))
                        continue
                    }

                    // --- 4.5 Fleet Health ---
                    if (text.includes('สุขภาพรถ') || text.includes(' fleet') || text.includes('สภาพรถ')) {
                        const health = await aiToolExecutors.get_fleet_health()
                        const lines = [
                            `🚛 แจ้งเตือนสถานะยานพาหนะ (${health.length} รายการ)`,
                            ''
                        ]
                        health.slice(0, 10).forEach((h: any) => lines.push(`- ${h.vehicle}: [${h.severity}] ${h.message}`))
                        if (health.length === 0) lines.push('✅ สภาพรถทุกคันปกติดีครับ')
                        await replyToUser(replyToken, lines.join('\n'))
                        continue
                    }

                    // --- 4.6 Leaves ---
                    if (text.includes('คนขับลา') || text.includes('ลาหยุด') || text.includes('ลาวันนี้')) {
                        const now = new Date()
                        const leaves = await aiToolExecutors.get_driver_leaves({ month: now.getMonth() + 1, year: now.getFullYear() })
                        const lines = [
                            '👥 รายการลาหยุด (เดือนนี้)',
                            ''
                        ]
                        leaves.slice(0, 10).forEach((l: any) => lines.push(`- ${l.driver}: ${l.from} ถึง ${l.to} (${l.type})`))
                        if (leaves.length === 0) lines.push('✅ ไม่มีคนขับลาหยุดในช่วงนี้ครับ')
                        await replyToUser(replyToken, lines.join('\n'))
                        continue
                    }

                    // --- 4.7 Job Search (JOB-ID) ---
                    if (text.includes('JOB-') || text.includes('เลขงาน-')) {
                        const jobId = rawText.split('-')[1]?.trim()
                        if (jobId) {
                            const job = await aiToolExecutors.get_job_details({ jobId })
                            if (job.error) {
                                await replyToUser(replyToken, `❌ ไม่พบงานรหัส ${jobId} ครับ`)
                            } else {
                                await replyToUser(replyToken, [
                                    `📦 รายละเอียดงาน #${job.Job_ID}`,
                                    `📍 ลูกค้า: ${job.Customer_Name}`,
                                    `สถานะ: ${job.Job_Status}`,
                                    `📅 วันที่: ${job.Plan_Date}`,
                                    `🚛 คนขับ: ${job.Driver_Name || 'ยังไม่มอบหมาย'}`,
                                    `🛻 ทะเบียน: ${job.Vehicle_Plate || '-'}`,
                                    `🗺️ เส้นทาง: ${job.Route_Name || '-'}`,
                                ].join('\n'))
                            }
                            continue
                        }
                    }
                }

                // 5. AI fallback (bound users only)
                if (boundAdmin || boundDriver || boundCustomer) {
                    const systemPrompt = await buildAIContext(branchId, userName)
                    const { text: aiResponse, error: aiError } = await callGeminiText(systemPrompt, rawText)
                    if (aiResponse) {
                        // LINE replyToken is single-use — use push for overflow parts
                        const parts = splitLineMessage(aiResponse)
                        await replyToUser(replyToken, parts[0])
                        for (let i = 1; i < parts.length; i++) {
                            await pushToUser(userId, parts[i])
                        }
                    } else {
                        // Show debug error so admin can diagnose
                        await replyToUser(replyToken, `⚠️ AI Error:\n${aiError || 'Unknown error'}\n\nกรุณารอสักครู่แล้วลองใหม่ครับ`)
                    }
                    continue
                }

                // Unbound user
                await replyToUser(replyToken, '👋 สวัสดีครับ!\nพิมพ์ BIND [รหัส] [เบอร์โทร] เพื่อเริ่มต้นใช้งาน\nหรือพิมพ์ HELP สำหรับข้อมูลเพิ่มเติม')
                continue
            }

            // ─────────────────────────────────────────────────────────────
            // AUDIO MESSAGE (Voice to Action)
            // ─────────────────────────────────────────────────────────────
            if (event.type === 'message' && event.message?.type === 'audio') {
                if (!boundAdmin && !boundDriver) {
                    await replyToUser(replyToken, '⚠️ ฟีเจอร์สั่งงานด้วยเสียงใช้ได้เฉพาะแอดมินและคนขับที่ผูกบัญชีแล้วครับ')
                    continue
                }

                try {
                    const audioBuffer = await getMessageContent(event.message.id)
                    const systemContext = await buildAIContext(branchId, userName)
                    const prompt = `${systemContext}\n\nผู้ใช้ส่งไฟล์เสียงมา:\n1. แปลความหมายจากเสียง\n2. หากสั่งสร้างงาน/บันทึกน้ำมัน ให้แจ้งข้อมูลที่ได้ยิน\n3. ตอบกลับสรุปว่าได้ยินอะไรและควรทำอะไร`

                    const aiResponse = await callGeminiMultimodal(prompt, 'วิเคราะห์เสียงนี้', 'audio/aac', audioBuffer)
                    await replyToUser(replyToken, aiResponse || '⚠️ AI ไม่สามารถวิเคราะห์เสียงได้ กรุณาลองอีกครั้งครับ')
                } catch (err) {
                    console.error('[Line Audio] Error:', err)
                    await replyToUser(replyToken, '❌ เกิดข้อผิดพลาดในการประมวลผลเสียง')
                }
                continue
            }

            // ─────────────────────────────────────────────────────────────
            // IMAGE MESSAGE (Receipt / Damage Photo Analysis)
            // ─────────────────────────────────────────────────────────────
            if (event.type === 'message' && event.message?.type === 'image') {
                if (!boundAdmin && !boundDriver) continue

                try {
                    const imageBuffer = await getMessageContent(event.message.id)
                    const systemContext = await buildAIContext(branchId, userName)
                    const prompt = `${systemContext}\n\nวิเคราะห์รูปภาพที่ได้รับ:\n- ถ้าเป็นใบเสร็จน้ำมัน: แจ้งชื่อปั๊ม, จำนวนลิตร, ราคา, ทะเบียนรถ\n- ถ้าเป็นรูปสินค้าเสียหาย: อธิบายความเสียหายที่เห็น\n- ถ้าเป็นอื่นๆ: สรุปสิ่งที่เห็น\nตอบเป็นภาษาไทย กระชับ`

                    const aiResponse = await callGeminiMultimodal(prompt, 'วิเคราะห์รูปนี้', 'image/jpeg', imageBuffer)
                    await replyToUser(replyToken, aiResponse || '⚠️ AI ไม่สามารถวิเคราะห์รูปภาพได้ครับ')
                } catch (err) {
                    console.error('[Line Image] Error:', err)
                    await replyToUser(replyToken, '❌ เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ')
                }
                continue
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('[Line Webhook] Critical error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
