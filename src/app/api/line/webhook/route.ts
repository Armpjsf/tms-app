import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

import { replyToUser, verifyLineSignature } from '@/lib/integrations/line'
import { aiToolExecutors } from '@/lib/ai/tools'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.0-pro",
]

/**
 * Build Admin AI system prompt with live data
 */
async function buildAdminAIContext(branchId?: string): Promise<string> {
    const results = await Promise.allSettled([
        aiToolExecutors.get_today_summary({ branchId }),
        aiToolExecutors.get_financial_summary({ branchId }),
        aiToolExecutors.get_all_drivers(),
        aiToolExecutors.get_all_vehicles(),
        aiToolExecutors.get_maintenance_stats(),
        aiToolExecutors.get_pending_repairs(),
        aiToolExecutors.get_fuel_analytics(),
        aiToolExecutors.get_fleet_health(),
        aiToolExecutors.get_damage_reports(),
        aiToolExecutors.get_driver_leaves({}),
    ])

    const safe = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
    const [todaySummary, financial, allDrivers, allVehicles, maintStats, pendingRepairs, fuel, fleetHealth, damage, leaves] = results
    const today = safe(todaySummary), fin = safe(financial)
    const drivers = safe(allDrivers) as any[], vehicles = safe(allVehicles) as any[]
    const repairs = safe(pendingRepairs) as any[], fuelData = safe(fuel)
    const health = safe(fleetHealth) as any[], damageData = safe(damage) as any[], leavesData = safe(leaves) as any[]

    const now = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    return [
        `คุณคือ "LogisPro AI Admin" ผู้ช่วยอัจฉริยะระบบ TMS เวลา: ${now}`,
        `งานวันนี้: ${today?.todayJobCount ?? 0} รายการ | กำลังวิ่ง: ${today?.stats?.active ?? 0} | เสร็จ: ${today?.stats?.completed ?? 0}`,
        `รายได้: ${fin?.revenue?.toLocaleString() ?? 0} บาท | กำไร: ${fin?.netProfit?.toLocaleString() ?? 0} บาท | Margin: ${fin?.margin?.toFixed(1) ?? 0}%`,
        `คนขับ: ${drivers?.length ?? 0} คน (Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0})`,
        `รถ: ${vehicles?.length ?? 0} คัน (Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0})`,
        `รอซ่อม: ${repairs?.length ?? 0} รายการ`,
        `ค่าน้ำมัน: ${fuelData?.totalFuelCost?.toLocaleString() ?? 0} บาท | ${fuelData?.totalLiters?.toFixed(0) ?? 0} ลิตร`,
        `Fleet Alert: ${health?.length ?? 0} รายการ`,
        `สินค้าเสียหาย: ${damageData?.length ?? 0} รายการ (รอตรวจ: ${damageData?.filter((d: any) => d.status === 'Pending').length ?? 0})`,
        `การลา: ${leavesData?.length ?? 0} รายการ (รออนุมัติ: ${leavesData?.filter((l: any) => l.status === 'Pending').length ?? 0})`,
        `กรุณาตอบเป็นภาษาไทย กระชับ ไม่เกิน 5 บรรทัด เหมาะกับการอ่านใน LINE`,
    ].join('\n')
}

/**
 * Call Gemini with fallback chain
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return null
    const genAI = new GoogleGenerativeAI(apiKey)
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent([systemPrompt, `คำถาม: ${userMessage}`])
            return result.response.text()
        } catch (err: any) {
            if (!err.message?.includes('404')) break
        }
    }
    return null
}

/**
 * LINE Chatbot Webhook
 */
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text()
        const signature = req.headers.get('x-line-signature') || ''

        if (!verifyLineSignature(bodyText, signature)) {
            console.warn('Unauthorized LINE Webhook attempt')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const body = JSON.parse(bodyText)
        const events = body.events || []
        const supabase = createAdminClient()

        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const rawText = event.message.text.trim()
                const text = rawText.toUpperCase()
                const replyToken = event.replyToken
                const userId = event.source.userId

                // 1. HELP / MENU
                if (text === 'HELP' || text === 'MENU' || text === 'เมนู' || text === 'ช่วยเหลือ') {
                    await replyToUser(replyToken, [
                        '🤖 LogisPro AI Bot Menu',
                        '',
                        '🔹 "งาน" หรือ "WORK" - ดูงานของคนขับ',
                        '🔹 "JOB-[เลขงาน]" - เช็คสถานะงาน',
                        '🔹 "สรุป" / "สรุป 03/2569" - สรุปงาน',
                        '🔹 "วางบิล" - ดูประวัติใบวางบิล',
                        '🔹 "BIND [รหัส] [เบอร์โทร]" - ผูกบัญชี',
                        '🔹 หรือถามอะไรก็ได้เลย! เช่น "งานวันนี้กี่งาน?" 🧠',
                    ].join('\n'))
                    continue
                }

                // 2. BIND
                if (text.startsWith('BIND ')) {
                    const parts = text.split(' ')
                    if (parts.length < 3) {
                        await replyToUser(replyToken, 'รูปแบบไม่ถูกต้อง\nกรุณาพิมพ์: BIND [รหัสพนักงาน/ลูกค้า] [เบอร์โทร]')
                        continue
                    }
                    const id = parts[1]
                    const phone = parts[2]

                    const { data: customer } = await supabase.from('Master_Customers')
                        .select('Customer_ID, Customer_Name').eq('Customer_ID', id).eq('Phone', phone).maybeSingle()
                    if (customer) {
                        await supabase.from('Master_Customers').update({ Line_User_ID: userId }).eq('Customer_ID', id)
                        await replyToUser(replyToken, `ยินดีด้วยครับ! คุณ ${customer.Customer_Name} (ลูกค้า) ผูกบัญชีสำเร็จแล้ว`)
                        continue
                    }

                    const { data: driver } = await supabase.from('Master_Drivers')
                        .select('Driver_ID, Driver_Name').eq('Driver_ID', id).eq('Mobile_No', phone).maybeSingle()
                    if (driver) {
                        await supabase.from('Master_Drivers').update({ Line_User_ID: userId }).eq('Driver_ID', id)
                        await replyToUser(replyToken, `ยินดีด้วยครับ! คุณ ${driver.Driver_Name} (คนขับ) ผูกบัญชีสำเร็จแล้ว\nพิมพ์ "งาน" เพื่อเริ่มงานได้ทันทีครับ`)
                        continue
                    }

                    const { data: adminUser } = await supabase.from('Master_Users')
                        .select('Username, Name, Role, Role_ID, Email')
                        .or(`Username.ilike.${id},Email.ilike.${id}`)
                        .maybeSingle()

                    if (adminUser && (adminUser.Role_ID <= 2 || adminUser.Role === 'Executive' || adminUser.Role === 'Super Admin')) {
                        if (phone === id || phone.toUpperCase() === 'ADMIN') {
                            await supabase.from('Master_Users').update({ Line_User_ID: userId }).eq('Username', id)
                            const isSuper = adminUser.Role_ID === 1 || adminUser.Role === 'Super Admin' || adminUser.Role === 'Executive'
                            const welcomeMsg = isSuper
                                ? `ยินดีต้อนรับท่านผู้บริหาร! คุณ ${adminUser.Name} ผูกบัญชีสำเร็จแล้ว\n\nตอนนี้ท่านสามารถถาม AI ได้ทุกอย่างเลยครับ เช่น "กำไรเดือนนี้เท่าไหร่?"`
                                : `ยินดีต้อนรับคุณ ${adminUser.Name} (Admin)! ผูกบัญชีสำเร็จแล้ว\n\nถาม AI ได้เลยครับ หรือเช็คงานด้วย JOB-[เลขงาน]`
                            await replyToUser(replyToken, welcomeMsg)
                            continue
                        }
                    }

                    await replyToUser(replyToken, 'ไม่พบข้อมูลในระบบ หรือข้อมูลยืนยันไม่ถูกต้อง')
                    continue
                }

                // 3. FETCH IDENTITIES
                const [{ data: boundCustomer }, { data: boundDriver }, { data: boundAdmin }] = await Promise.all([
                    supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Users').select('Username, Name, Role, Role_ID, Branch_ID').eq('Line_User_ID', userId).maybeSingle()
                ])

                const isExecutive = boundAdmin && (boundAdmin.Role_ID === 1 || boundAdmin.Role === 'Executive' || boundAdmin.Role === 'Super Admin')

                // 4. DRIVER WORK COMMANDS
                if (boundDriver) {
                    if (text === 'WORK' || text === 'งาน') {
                        const { data: jobs } = await supabase.from('Jobs_Main')
                            .select('Job_ID, Job_Status, Route_Name')
                            .eq('Driver_ID', boundDriver.Driver_ID)
                            .neq('Job_Status', 'Completed')
                            .limit(5)

                        if (!jobs || jobs.length === 0) {
                            await replyToUser(replyToken, `คุณ ${boundDriver.Driver_Name} ไม่มีงานค้างในระบบครับ`)
                        } else {
                            const lines = [`รายการงานของคุณ ${boundDriver.Driver_Name}:`]
                            jobs.forEach(j => lines.push(`${j.Job_ID} - ${j.Job_Status} (${j.Route_Name})\nอัปเดต: พิมพ์ ${j.Job_ID} START`))
                            await replyToUser(replyToken, lines.join('\n\n'))
                        }
                        continue
                    }

                    if (text.includes(' START') || text.includes(' เริ่ม')) {
                        const jobId = text.split(' ')[0]
                        const { error } = await supabase.from('Jobs_Main')
                            .update({ Job_Status: 'In Progress' })
                            .eq('Job_ID', jobId)
                            .eq('Driver_ID', boundDriver.Driver_ID)
                        await replyToUser(replyToken, error ? `ไม่สามารถเริ่มงานได้: ${error.message}` : `เริ่มงาน ${jobId} เรียบร้อย! ขอให้เดินทางปลอดภัยครับ`)
                        continue
                    }
                }

                // 5. CUSTOMER GUARD
                if (!boundCustomer && !boundDriver && !boundAdmin) {
                    if (['SUMMARY', 'สรุป', 'BILLING', 'วางบิล', 'งาน', 'WORK'].includes(text)) {
                        await replyToUser(replyToken, 'คุณยังไม่ได้ผูกบัญชีครับ\nพิมพ์ BIND [รหัส] [เบอร์โทร] เพื่อเริ่มต้นใช้งาน')
                        continue
                    }
                }

                // 6. SUMMARY
                if (text.startsWith('SUMMARY') || text.startsWith('สรุป')) {
                    if (!boundCustomer) continue

                    let dateDisplay = 'วันนี้'
                    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
                    let startDate = todayStr, endDate = todayStr

                    const normalizeYear = (y: string) => {
                        let year = parseInt(y)
                        if (year > 2500) year -= 543
                        return year.toString()
                    }

                    const yearMatch = text.match(/\b(20\d{2}|25\d{2})\b/)
                    const monthYearMatch = text.match(/(\d{2})\/(\d{2,4})/) || text.match(/(\d{2,4})\/(\d{2})/)
                    const fullDateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/) || text.match(/(\d{2,4})\/(\d{2})\/(\d{2})/)

                    if (fullDateMatch) {
                        if (fullDateMatch[1].length >= 3) {
                            const [, y, m, d] = fullDateMatch
                            startDate = endDate = `${normalizeYear(y)}-${m}-${d}`
                            dateDisplay = `${d}/${m}/${y}`
                        } else {
                            const [, d, m, y] = fullDateMatch
                            startDate = endDate = `${normalizeYear(y)}-${m}-${d}`
                            dateDisplay = fullDateMatch[0]
                        }
                    } else if (monthYearMatch) {
                        let y, m
                        if (monthYearMatch[1].length >= 3) { [, y, m] = monthYearMatch } else { [, m, y] = monthYearMatch }
                        const adYear = normalizeYear(y)
                        startDate = `${adYear}-${m}-01`
                        const nm = parseInt(m) === 12 ? 1 : parseInt(m) + 1
                        const ny = parseInt(m) === 12 ? parseInt(adYear) + 1 : adYear
                        endDate = `${ny}-${nm.toString().padStart(2, '0')}-01`
                        dateDisplay = `เดือน ${m}/${y}`
                    } else if (yearMatch) {
                        const adYear = normalizeYear(yearMatch[1])
                        startDate = `${adYear}-01-01`
                        endDate = `${parseInt(adYear) + 1}-01-01`
                        dateDisplay = `ปี ${yearMatch[1]}`
                    }

                    let query = supabase.from('Jobs_Main').select('Job_Status')
                        .or(`Customer_ID.eq."${boundCustomer.Customer_ID}",Customer_Name.ilike."%${boundCustomer.Customer_Name.trim()}%"`)
                    query = startDate === endDate ? query.eq('Plan_Date', startDate) : query.gte('Plan_Date', startDate).lt('Plan_Date', endDate)

                    const { data: jobs, error: summaryError } = await query
                    if (summaryError || !jobs || jobs.length === 0) {
                        await replyToUser(replyToken, `คุณ ${boundCustomer.Customer_Name}\nช่วงเวลา ${dateDisplay} ยังไม่มีรายการในระบบครับ`)
                        continue
                    }

                    const total = jobs.length
                    const done = jobs.filter(j => ['delivered', 'completed', 'success', 'สำเร็จ'].includes((j.Job_Status || '').toLowerCase())).length
                    await replyToUser(replyToken, `สรุปงาน (${dateDisplay})\nคุณ ${boundCustomer.Customer_Name}\n\nทั้งหมด: ${total} รายการ\nสำเร็จแล้ว: ${done}\nรอดำเนินการ: ${total - done}`)
                    continue
                }

                // 7. BILLING
                if (text === 'BILLING' || text === 'วางบิล') {
                    if (!boundCustomer) continue
                    const { data: bills } = await supabase.from('Billing_Notes')
                        .select('Billing_Note_ID, Billing_Date, Total_Amount, Status')
                        .eq('Customer_Name', boundCustomer.Customer_Name)
                        .order('Created_At', { ascending: false }).limit(5)

                    if (!bills || bills.length === 0) {
                        await replyToUser(replyToken, 'ยังไม่มีประวัติการวางบิลในระบบครับ')
                        continue
                    }

                    const lines = [`ประวัติการวางบิล 5 รายการล่าสุด\nคุณ ${boundCustomer.Customer_Name}\n`]
                    bills.forEach(b => lines.push(`${b.Billing_Note_ID}\nวันที่: ${new Date(b.Billing_Date).toLocaleDateString('th-TH')}\nยอด: ${b.Total_Amount?.toLocaleString()} บาท\nสถานะ: ${b.Status === 'Paid' ? 'ชำระแล้ว' : 'รอดำเนินการ'}`))
                    await replyToUser(replyToken, lines.join('\n\n'))
                    continue
                }

                // 8. JOB TRACKING
                if (text.startsWith('JOB-')) {
                    const { data: jobList, error: queryError } = await supabase
                        .from('Jobs_Main').select('*').ilike('Job_ID', text.trim()).limit(1)
                    const job = jobList?.[0]

                    if (queryError || !job) {
                        await replyToUser(replyToken, `ไม่พบข้อมูลงานหมายเลข: ${text}`)
                        continue
                    }

                    const isAuthorized = boundAdmin || (boundCustomer && (
                        job.Customer_ID === boundCustomer.Customer_ID ||
                        job.Customer_Name?.toLowerCase().includes(boundCustomer.Customer_Name.toLowerCase())
                    ))
                    if (!isAuthorized) {
                        await replyToUser(replyToken, 'คุณไม่มีสิทธิ์ดูข้อมูลหมายเลขนี้ครับ')
                        continue
                    }

                    let extra = ''
                    if (job.Driver_ID) {
                        const { data: driverInfo } = await supabase.from('Master_Drivers')
                            .select('Mobile_No').eq('Driver_ID', job.Driver_ID).maybeSingle()
                        if (driverInfo?.Mobile_No) extra += `\nติดต่อคนขับ (${job.Driver_Name}): ${driverInfo.Mobile_No}`
                        if (job.Job_Status === 'In Progress' || job.Job_Status === 'In Transit') {
                            const { data: gps } = await supabase.from('GPS_Logs')
                                .select('Latitude, Longitude').eq('Driver_ID', job.Driver_ID)
                                .order('Timestamp', { ascending: false }).limit(1).maybeSingle()
                            if (gps) extra += `\nพิกัดปัจจุบัน: https://maps.google.com/?q=${gps.Latitude},${gps.Longitude}`
                        }
                    }

                    await replyToUser(replyToken, [
                        `งาน: ${job.Job_ID}`,
                        `ลูกค้า: ${job.Customer_Name}`,
                        `สถานะ: ${job.Job_Status}`,
                        `อัปเดต: ${new Date(job.Updated_At || job.Created_At).toLocaleString('th-TH')}${extra}`
                    ].join('\n'))
                    continue
                }

                // ================================================================
                // 9. AI FALLBACK - Free text questions for Admin & Driver
                // ================================================================
                if (boundAdmin || boundDriver) {
                    try {
                        const branchId = boundAdmin?.Branch_ID || undefined
                        const userName = boundAdmin?.Name || boundDriver?.Driver_Name || 'ผู้ใช้'
                        const systemPrompt = await buildAdminAIContext(branchId)
                        const aiResponse = await callGemini(systemPrompt, rawText)

                        if (aiResponse) {
                            await replyToUser(replyToken, `AI Admin (${userName}):\n${aiResponse}`)
                        } else {
                            await replyToUser(replyToken, 'ระบบ AI ขัดข้องชั่วคราว กรุณาพิมพ์ "เมนู" เพื่อดูคำสั่งที่รองรับครับ')
                        }
                    } catch (aiErr) {
                        console.error('LINE AI error:', aiErr)
                        await replyToUser(replyToken, 'เกิดข้อผิดพลาดใน AI กรุณาลองใหม่อีกครั้งครับ')
                    }
                    continue
                }

                // Unbound user
                if (!boundCustomer && !boundDriver && !boundAdmin) {
                    await replyToUser(replyToken, 'สวัสดีครับ! ยังไม่ได้ผูกบัญชี\nพิมพ์ BIND [รหัส] [เบอร์โทร] หรือพิมพ์ "เมนู" เพื่อดูวิธีใช้งานครับ')
                }
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
