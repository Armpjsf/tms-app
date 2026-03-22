import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFinancialStats } from '@/lib/supabase/financial-analytics'
import { getVehicleProfitability, getOperationalStats, getDriverLeaderboard } from '@/lib/supabase/fleet-analytics'
import { getMaintenanceSchedule } from '@/lib/supabase/maintenance-schedule'
import { getSafetyAnalytics } from '@/lib/supabase/safety-analytics'
import { getESGStats } from '@/lib/supabase/esg-analytics'
import { getSession } from '@/lib/session'
import { GoogleGenerativeAI } from "@google/generative-ai"

interface SystemContext {
    financials?: any;
    operations?: any;
    maintenance?: any;
    safety?: any;
    esg?: any;
    leaderboard?: any;
    profitability?: any;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { message } = await req.json()
        if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (!apiKey) {
            console.error('[AI] CRITICAL: NEXT_PUBLIC_GEMINI_API_KEY is not defined in process.env')
            return NextResponse.json({ response: "ขออภัยครับ ไม่พบ API Key (GEMINI_API_KEY) ในระบบ กรุณาตรวจสอบไฟล์ .env.local" })
        }
        console.log(`[AI] Using API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`)

        const genAI = new GoogleGenerativeAI(apiKey)
        
        const cookieStore = await cookies()
        const selectedBranch = cookieStore.get('selectedBranch')?.value
        const branchId = selectedBranch === 'All' ? undefined : (selectedBranch || session.branchId || undefined)

        // 1. Aggregate System Context with individual error handling
        let contextData: SystemContext = {}
        try {
            const [
                financials,
                operations,
                maintenance,
                safety,
                esg,
                leaderboard,
                profitability
            ] = await Promise.all([
                getFinancialStats(undefined, undefined, branchId).catch(e => ({ error: e.message })),
                getOperationalStats(branchId).catch(e => ({ error: e.message })),
                getMaintenanceSchedule().catch(e => ({ error: e.message })),
                getSafetyAnalytics().catch(e => ({ error: e.message })),
                getESGStats(undefined, undefined, branchId).catch(e => ({ error: e.message })),
                getDriverLeaderboard(undefined, undefined, branchId).catch(e => ({ error: e.message })),
                getVehicleProfitability(undefined, undefined, branchId).catch(e => ({ error: e.message }))
            ])
            contextData = { financials, operations, maintenance, safety, esg, leaderboard, profitability }
        } catch (e) {
            console.error('Context Aggregation Error:', e)
        }

        const systemContext = `
            You are the "LogisPro Tactical AI", a highly advanced fleet management assistant.
            Current User: ${session.username}
            Role: Admin/SuperAdmin
            Branch Context: ${branchId || 'All Branches'}
            
            Current Operational Data:
            - Financials: Income ฿${contextData.financials?.revenue?.toLocaleString() || 'N/A'}, Expense ฿${contextData.financials?.cost?.total?.toLocaleString() || 'N/A'}, Net Profit ฿${contextData.financials?.netProfit?.toLocaleString() || 'N/A'}
            - Fleet Operations: Total ${contextData.operations?.fleet?.total || 0}, Active ${contextData.operations?.fleet?.active || 0}, On-Time ${contextData.operations?.fleet?.onTimeDelivery?.toFixed(1) || 0}%
            - Maintenance: Active Repairs ${contextData.maintenance?.activeRepairs || 0}, Overdue ${contextData.maintenance?.overdue?.length || 0} vehicles.
            - Safety/SOS: Total SOS ${contextData.safety?.sos?.total || 0}, Active SOS ${contextData.safety?.sos?.active || 0}. POD Compliance ${contextData.safety?.pod?.complianceRate?.toFixed(1) || 0}%
            - Environmental (ESG): CO2 Saved ${contextData.esg?.co2SavedKg?.toLocaleString() || 0} kg
            - Top Drivers: ${Array.isArray(contextData.leaderboard) ? contextData.leaderboard.slice(0, 3).map((d: any) => `${d.name} (฿${d.revenue?.toLocaleString()})`).join(', ') : 'N/A'}
            - Top Profitable Vehicles: ${Array.isArray(contextData.profitability) ? contextData.profitability.slice(0, 3).map((v: any) => `${v.plate} (฿${v.netProfit?.toLocaleString()})`).join(', ') : 'N/A'}

            Instructions:
            1. Answer the user's question precisely using the data provided above.
            2. Be professional, tactical, and helpful. Use a "Command Center" tone.
            3. Answer in Thai. Use professional but modern language.
        `

        // 2. Generate Response with Gemini (with fallback)
        let responseText = ""
        const modelsToTry = [
            { name: "models/gemini-1.5-flash", version: 'v1beta' },
            { name: "models/gemini-1.5-pro", version: 'v1beta' },
            { name: "gemini-1.5-flash", version: 'v1' },
            { name: "gemini-pro", version: 'v1' }
        ]
        let lastError: any = null

        try {
            for (const item of modelsToTry) {
                try {
                    console.log(`[AI] Attempting ${item.name} (${item.version})...`)
                    const model = genAI.getGenerativeModel({ model: item.name }, { apiVersion: item.version })
                    const result = await model.generateContent([
                        { text: systemContext },
                        { text: `User request: ${message}` }
                    ])
                    responseText = result.response.text()
                    if (responseText) break
                } catch (err: any) {
                    console.warn(`[AI] ${item.name} (${item.version}) failed:`, err.message)
                    lastError = err
                }
            }
        } catch (e) {
            console.error('[AI] All models failed or critical error:', e)
        }
        
        // 3. Last Resort: Keyword-based response if AI fails
        if (!responseText) {
            const text = message.toLowerCase()
            const getSafeVal = (val: any) => val?.toLocaleString() || 'N/A'
            
            if (text.includes('รายได้') || text.includes('revenue') || text.includes('เงิน')) {
                responseText = `💰 [SafeMode] รายได้รวมเดือนนี้อยู่ที่ประมาณ ฿${getSafeVal(contextData.financials?.revenue)} (โต ${contextData.financials?.revenueGrowth?.toFixed(1) || 0}%)`
            } 
            else if (text.includes('กำไร') || text.includes('profit')) {
                responseText = `📈 [SafeMode] กำไรสุทธิคือ ฿${getSafeVal(contextData.financials?.netProfit)} (Margin: ${contextData.financials?.profitMargin?.toFixed(1) || 0}%)`
            } 
            else if (text.includes('รถ') && (text.includes('ดี') || text.includes('กำไร'))) {
                const topV = Array.isArray(contextData.profitability) ? contextData.profitability[0] : null
                responseText = `🚛 [SafeMode] รถที่ทำกำไรดีที่สุดคือ ${topV?.plate || 'N/A'} (กำไรสุทธิ ฿${getSafeVal(topV?.netProfit)})`
            }
            else if (text.includes('สถานะ') || text.includes('งาน') || text.includes('คนขับ')) {
                const ops = contextData.operations?.fleet
                responseText = `🚚 [SafeMode] สถานะฟลีทวันนี้: รถทั้งหมด ${ops?.total || 0} คัน, กำลังวิ่ง ${ops?.active || 0} คัน, ส่งตรงเวลา ${ops?.onTimeDelivery?.toFixed(1) || 0}%`
            }
            else if (text.includes('ซ่อม') || text.includes('บำรุง') || text.includes('รักษ')) {
                responseText = `🔧 [SafeMode] แผนซ่อมบำรุง: กำลังซ่อม ${contextData.maintenance?.activeRepairs || 0} คัน, และมีรถที่ตรวจเช็คเกินกำหนด ${contextData.maintenance?.overdue?.length || 0} คัน`
            }
            else if (text.includes('อุบัติเหตุ') || text.includes('sos') || text.includes('ปลอดภัย')) {
                responseText = `⚠️ [SafeMode] รายงานความปลอดภัย: แจ้ง SOS ${contextData.safety?.sos?.active || 0} เคส (จากทั้งหมด ${contextData.safety?.sos?.total || 0})`
            }
            else {
                responseText = `🤖 [SafeMode] ขออภัยครับ ระบบประมวลผล Gemini ยังขัดข้อง (404) 
                แต่ผมยังตอบเรื่องเหล่านี้ได้ครับ:
                • การเงิน (รายได้, กำไร)
                • งานวันนี้ (สถานะรถ, การส่งมอบ)
                • ซ่อมบำรุง (รถซ่อม, รถที่ต้องเช็ค)
                • ความปลอดภัย (SOS, กฎจราจร)
                
                (Error: ${lastError?.message || 'Check Server Logs'})`
            }
        }

        return NextResponse.json({ response: responseText })
    } catch (error: any) {
        console.error('AI Chat Error details:', error)
        return NextResponse.json({ 
            response: `ขออภัยครับ หน่วยประมวลผลขัดข้อง: [${error.message || 'Unknown Error'}] กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายเทคนิค` 
        })
    }
}
