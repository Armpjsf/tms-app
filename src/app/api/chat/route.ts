import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/session'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { aiToolExecutors } from '@/lib/ai/tools'

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

        // 1. Fetch System Data (Knowledge Base)
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
            dataContext = "ไม่สามารถเข้าถึงข้อมูลระบบแบบ Real-time ได้ในขณะนี้"
        }

        // 2. Initialize Gemini with THE MOST COMPATIBLE config
        const genAI = new GoogleGenerativeAI(apiKey)
        
        // เราใช้ชื่อรุ่น "gemini-1.5-flash" ตรงๆ โดยไม่ผ่านออปชัน apiVersion ในตัว getGenerativeModel 
        // เพื่อให้ SDK ตัวล่าสุดจัดการสร้าง URL ที่ถูกต้อง (v1beta/models/...) ให้เอง
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const systemPrompt = `คุณคือ LogisPro AI Admin. ข้อมูลปัจจุบัน: ${dataContext}. กรุณาตอบคำถามแอดมินเป็นภาษาไทยอย่างสั้น กระชับ และแม่นยำ.`

        const result = await model.generateContent([systemPrompt, message])
        const responseText = result.response.text()

        return NextResponse.json({ response: responseText })

    } catch (error: any) {
        console.error('[AI Chat] Error:', error)
        return NextResponse.json({ 
            response: `ระบบ AI ขัดข้อง: [${error.message}]. กรุณาลองใหม่อีกครั้งครับ` 
        })
    }
}
