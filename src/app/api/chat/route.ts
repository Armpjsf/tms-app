import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/session'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { aiToolExecutors } from '@/lib/ai/tools'

// Models to try in order - newest/most available first
const GEMINI_MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.0-pro",
]

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { message } = body
        if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ response: "ขออภัยครับ ไม่พบ API Key ในระบบ" })
        }

        // 1. Fetch System Data
        let dataContext = ""
        try {
            const cookieStore = await cookies()
            const selectedBranch = cookieStore.get('selectedBranch')?.value
            const branchId = selectedBranch === 'All' ? undefined : (selectedBranch || session.branchId || undefined)

            const [todaySummary, financial] = await Promise.all([
                aiToolExecutors.get_today_summary({ branchId }),
                aiToolExecutors.get_financial_summary({ branchId })
            ])

            dataContext = `ข้อมูลระบบ: งานวันนี้ ${todaySummary.todayJobCount} รายการ, วิ่งอยู่ ${todaySummary.stats?.active || 0} คัน, เสร็จแล้ว ${todaySummary.stats?.completed || 0} รายการ, รายได้รวม ฿${financial.revenue?.toLocaleString() || 0}, กำไร ฿${financial.netProfit?.toLocaleString() || 0}`
        } catch (e) {
            dataContext = "ไม่สามารถเข้าถึงข้อมูลระบบได้ในขณะนี้"
        }

        const systemPrompt = `คุณคือ LogisPro AI Admin. ข้อมูลปัจจุบัน: ${dataContext}. กรุณาตอบคำถามแอดมินเป็นภาษาไทยอย่างสั้น กระชับ และแม่นยำ.`
        const genAI = new GoogleGenerativeAI(apiKey)

        // 2. Try each model until one works
        let lastError: Error | null = null
        for (const modelName of GEMINI_MODELS) {
            try {
                console.log(`[AI Chat] Trying model: ${modelName}...`)
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent([systemPrompt, message])
                const responseText = result.response.text()
                console.log(`[AI Chat] Success with model: ${modelName}`)
                return NextResponse.json({ response: responseText })
            } catch (err: any) {
                console.warn(`[AI Chat] Model ${modelName} failed: ${err.message}`)
                lastError = err
                // Only continue retrying if it's a 404 (model not found)
                if (!err.message?.includes('404')) break
            }
        }

        // 3. All models failed - use SafeMode keyword fallback
        console.warn('[AI Chat] All Gemini models failed, using SafeMode...')
        const lowerMsg = message.toLowerCase()
        let safeResponse = "🤖 [SafeMode] ขออภัยครับ ระบบ AI หลักขัดข้องชั่วคราว"
        if (lowerMsg.includes('งาน') || lowerMsg.includes('job')) {
            safeResponse = `🤖 [SafeMode] ข้อมูลระบบ: ${dataContext || 'ไม่มีข้อมูล'}`
        } else if (lowerMsg.includes('รายได้') || lowerMsg.includes('กำไร')) {
            safeResponse = `🤖 [SafeMode] ${dataContext || 'ไม่มีข้อมูลการเงิน'}`
        }

        return NextResponse.json({ response: safeResponse })

    } catch (error: any) {
        console.error('[AI Chat] Critical Error:', error)
        return NextResponse.json({ 
            response: `ระบบ AI ขัดข้อง: [${error.message}]. กรุณาลองใหม่อีกครั้งครับ` 
        })
    }
}
