import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/session'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { aiToolExecutors } from '@/lib/ai/tools'

// Models to try in order - stable versions prioritized
const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
]

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { message } = body
        if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        
        // Use server-side key if available, fallback to public key
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ response: "AI System: ไม่พบ API Key ในการตั้งค่าระบบ" })
        }

        const cookieStore = await cookies()
        const selectedBranch = cookieStore.get('selectedBranch')?.value
        const branchId = selectedBranch === 'All' ? undefined : (selectedBranch || session.branchId || undefined)

        // =====================================================================
        // 1. BUILD COMPREHENSIVE KNOWLEDGE BASE
        //    Load all system data in parallel, silently ignore failures
        // =====================================================================
        const [
            todaySummary,
            financial,
            allDrivers,
            allVehicles,
            maintenanceStats,
            pendingRepairs,
            fuelAnalytics,
            fleetHealth,
            damageReports,
            driverLeaves,
            workforceAnalytics,
        ] = await Promise.allSettled([
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
            aiToolExecutors.get_workforce_analytics(),
        ])

        const safe = (result: PromiseSettledResult<any>) =>
            result.status === 'fulfilled' ? result.value : null

        const today = safe(todaySummary)
        const fin = safe(financial)
        const drivers = safe(allDrivers) as any[] | null
        const vehicles = safe(allVehicles) as any[] | null
        const maintStats = safe(maintenanceStats)
        const repairs = safe(pendingRepairs) as any[] | null
        const fuel = safe(fuelAnalytics)
        const health = safe(fleetHealth) as any[] | null
        const damage = safe(damageReports) as any[] | null
        const leaves = safe(driverLeaves) as any[] | null
        const workforce = safe(workforceAnalytics)

        // =====================================================================
        // 2. CONSTRUCT RICH SYSTEM PROMPT  
        // =====================================================================
        const now = new Date().toLocaleDateString('th-TH', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        })
        const systemPrompt = `
คุณคือ "LogisPro AI Admin" ผู้ช่วยอัจฉริยะของระบบบริหารการขนส่ง LogisPro
วันที่และเวลาปัจจุบัน: ${now}
ผู้ใช้งานปัจจุบัน: ${session.username || 'Admin'} | สาขา: ${branchId || 'ทุกสาขา'}

═══════════════════════════════════════════════════════
📦 ข้อมูลงานวันนี้
═══════════════════════════════════════════════════════
- จำนวนงานทั้งหมด: ${today?.todayJobCount ?? 'N/A'} รายการ
- กำลังวิ่ง: ${today?.stats?.active ?? 0} คัน
- เสร็จแล้ว: ${today?.stats?.completed ?? 0} รายการ
- รอดำเนินการ: ${today?.stats?.pending ?? 0} รายการ
- งานล่าสุด 5 รายการ: ${JSON.stringify(today?.jobs ?? [])}

═══════════════════════════════════════════════════════
💰 ข้อมูลการเงิน (เดือนนี้)
═══════════════════════════════════════════════════════
- รายได้รวม: ฿${fin?.revenue?.toLocaleString() ?? 'N/A'}
- ค่าใช้จ่ายรวม: ฿${fin?.cost?.toLocaleString() ?? 'N/A'}
- กำไรสุทธิ: ฿${fin?.netProfit?.toLocaleString() ?? 'N/A'}
- อัตรากำไร: ${fin?.margin?.toFixed(1) ?? 'N/A'}%

═══════════════════════════════════════════════════════
👨‍✈️ ข้อมูลพนักงานขับรถ
═══════════════════════════════════════════════════════
- จำนวนคนขับทั้งหมด: ${drivers?.length ?? 0} คน
- คนขับที่ Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0} คน
- รายชื่อคนขับ: ${drivers?.slice(0, 10).map((d: any) => `${d.name} (${d.id})`).join(', ') ?? 'ไม่มีข้อมูล'}

═══════════════════════════════════════════════════════
🚛 ข้อมูลยานพาหนะ
═══════════════════════════════════════════════════════
- จำนวนรถทั้งหมด: ${vehicles?.length ?? 0} คัน
- รถที่ Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0} คัน
- ทะเบียนรถ (10 คันแรก): ${vehicles?.slice(0, 10).map((v: any) => v.plate).join(', ') ?? 'ไม่มีข้อมูล'}

═══════════════════════════════════════════════════════
🔧 ข้อมูลการซ่อมบำรุง
═══════════════════════════════════════════════════════
- สรุปภาพรวม: ${JSON.stringify(maintStats ?? {})}
- ซ่อมที่รอดำเนินการ: ${repairs?.length ?? 0} รายการ
- รายการซ่อมที่รอ: ${repairs?.slice(0, 5).map((r: any) => `${r.vehicle}: ${r.problem}`).join(' | ') ?? 'ไม่มี'}

═══════════════════════════════════════════════════════
⛽ ข้อมูลการเติมน้ำมัน
═══════════════════════════════════════════════════════
- ค่าน้ำมันรวม: ฿${fuel?.totalFuelCost?.toLocaleString() ?? 'N/A'}
- ปริมาณน้ำมันรวม: ${fuel?.totalLiters?.toLocaleString() ?? 'N/A'} ลิตร
- เฉลี่ยต่อเที่ยว: ${fuel?.avgPerTrip?.toFixed(1) ?? 'N/A'} ลิตร

═══════════════════════════════════════════════════════
🚨 สถานะสุขภาพยานพาหนะ (Fleet Health)
═══════════════════════════════════════════════════════
- การแจ้งเตือน: ${health?.length ?? 0} รายการ
- รายละเอียด: ${health?.slice(0, 3).map((h: any) => `[${h.severity}] ${h.vehicle}: ${h.alert}`).join(' | ') ?? 'ไม่มีการแจ้งเตือน'}

═══════════════════════════════════════════════════════
💥 รายงานสินค้าเสียหาย
═══════════════════════════════════════════════════════
- รายการทั้งหมด: ${damage?.length ?? 0} รายการ
- รอการตรวจสอบ: ${damage?.filter((d: any) => d.status === 'Pending').length ?? 0} รายการ

═══════════════════════════════════════════════════════
📅 การลาของพนักงาน
═══════════════════════════════════════════════════════
- การลาเดือนนี้: ${leaves?.length ?? 0} รายการ
- รอการอนุมัติ: ${leaves?.filter((l: any) => l.status === 'Pending').length ?? 0} รายการ

═══════════════════════════════════════════════════════
📊 ข้อมูล Workforce
═══════════════════════════════════════════════════════
${JSON.stringify(workforce ?? {})}

═══════════════════════════════════════════════════════
📌 คำสั่งพิเศษ
═══════════════════════════════════════════════════════
- ตอบคำถามทุกอย่างในระบบที่ผู้ใช้ถาม โดยใช้ข้อมูลด้านบนเป็นหลัก
- หากถามเรื่องคนขับหรือรถเฉพาะเจาะจง ให้ค้นหาจากฐานข้อมูลด้านบนก่อน
- ตอบเป็นภาษาไทยอย่างมืออาชีพ กระชับ และให้ข้อมูลที่แม่นยำ
- หากถามเรื่องที่ไม่มีข้อมูล ให้บอกว่าต้องการข้อมูลเพิ่มเติมหรือให้โทรถามสาขา
- สามารถทำสรุป วิเคราะห์แนวโน้ม หรือเสนอคำแนะนำได้
        `.trim()

        // =====================================================================
        // 3. CALL GEMINI WITH FALLBACK
        // =====================================================================
        const genAI = new GoogleGenerativeAI(apiKey)

        for (const modelName of GEMINI_MODELS) {
            try {
                console.log(`[AI Chat] Connecting via: ${modelName}...`)
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent([systemPrompt, `User Request: ${message}`])
                const responseText = result.response.text()
                
                if (responseText) {
                    console.log(`[AI Chat] Success with: ${modelName}`)
                    return NextResponse.json({ response: responseText })
                }
            } catch (err: any) {
                const errMsg = err.message || ''
                console.warn(`[AI Chat] ${modelName} failed: ${errMsg}`)
                
                // Critical failures (Auth/Quota) should stop the loop early
                if (errMsg.includes('429') || errMsg.includes('403') || errMsg.includes('API key')) {
                    console.error('[AI Chat] Terminating model loop due to critical API error.')
                    break
                }
                continue 
            }
        }

        // =====================================================================
        // 4. SAFEMODE - Data-aware fallback
        // =====================================================================
        console.warn('[AI Chat] All Gemini models failed, using data-aware SafeMode...')
        const lower = message.toLowerCase()
        let safeResponse = "🤖 [SafeMode] ขออภัยครับ ระบบ AI หลักขัดข้องชั่วคราว"
        
        if (lower.includes('งาน') || lower.includes('job') || lower.includes('วันนี้')) {
            safeResponse = `📦 [SafeMode] งานวันนี้: ${today?.todayJobCount ?? 0} รายการ | กำลังวิ่ง ${today?.stats?.active ?? 0} คัน | เสร็จแล้ว ${today?.stats?.completed ?? 0} รายการ`
        } else if (lower.includes('รายได้') || lower.includes('กำไร') || lower.includes('เงิน')) {
            safeResponse = `💰 [SafeMode] รายได้: ฿${fin?.revenue?.toLocaleString() ?? 0} | กำไร: ฿${fin?.netProfit?.toLocaleString() ?? 0} | Margin: ${fin?.margin?.toFixed(1) ?? 0}%`
        } else if (lower.includes('คนขับ') || lower.includes('driver')) {
            safeResponse = `👨‍✈️ [SafeMode] คนขับ ${drivers?.length ?? 0} คน | Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0} คน`
        } else if (lower.includes('รถ') || lower.includes('vehicle')) {
            safeResponse = `🚛 [SafeMode] รถทั้งหมด ${vehicles?.length ?? 0} คัน | Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0} คัน`
        } else if (lower.includes('ซ่อม') || lower.includes('maintenance')) {
            safeResponse = `🔧 [SafeMode] รอซ่อม: ${repairs?.length ?? 0} รายการ`
        } else if (lower.includes('น้ำมัน') || lower.includes('fuel')) {
            safeResponse = `⛽ [SafeMode] ค่าน้ำมันรวม: ฿${fuel?.totalFuelCost?.toLocaleString() ?? 0}`
        } else if (lower.includes('ลา') || lower.includes('leave')) {
            safeResponse = `📅 [SafeMode] การลา ${leaves?.length ?? 0} รายการ | รออนุมัติ ${leaves?.filter((l: any) => l.status === 'Pending').length ?? 0} รายการ`
        } else if (lower.includes('เสียหาย') || lower.includes('damage')) {
            safeResponse = `💥 [SafeMode] รายงานสินค้าเสียหาย ${damage?.length ?? 0} รายการ | รอตรวจสอบ ${damage?.filter((d: any) => d.status === 'Pending').length ?? 0} รายการ`
        }

        return NextResponse.json({ response: safeResponse })

    } catch (error: any) {
        console.error('[AI Chat] Critical Error:', error)
        return NextResponse.json({ 
            response: `ระบบ AI ขัดข้อง: [${error.message}]` 
        })
    }
}
