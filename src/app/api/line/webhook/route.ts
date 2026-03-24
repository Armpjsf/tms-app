import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

import { replyToUser, verifyLineSignature, getMessageContent, pushToUser } from '@/lib/integrations/line'
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
 * Call Gemini with Multimodal support (Audio/Image)
 */
async function callGeminiMultimodal(systemPrompt: string, prompt: string, mimeType: string, data: Buffer): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return null
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use models that support multimodal
    const MULTIMODAL_MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash"]
    
    for (const modelName of MULTIMODAL_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent([
                systemPrompt,
                {
                    inlineData: {
                        mimeType,
                        data: data.toString('base64')
                    }
                },
                prompt
            ])
            return result.response.text()
        } catch (err) {
            console.error(`Gemini Multimodal (${modelName}) failed:`, err)
        }
    }
    return null
}

/**
 * Build Admin AI system prompt with rich data (similar to main web chat)
 */
async function buildAdminAIContext(branchId?: string, userName: string = 'Admin'): Promise<string> {
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
        aiToolExecutors.get_workforce_analytics(),
    ])

    const safe = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
    const [
        todaySummary, 
        financial, 
        allDrivers, 
        allVehicles, 
        maintStats, 
        pendingRepairs, 
        fuel, 
        fleetHealth, 
        damage, 
        leaves,
        workforce
    ] = results

    const today = safe(todaySummary), fin = safe(financial)
    const drivers = safe(allDrivers) as any[], vehicles = safe(allVehicles) as any[]
    const repairs = safe(pendingRepairs) as any[], fuelData = safe(fuel)
    const health = safe(fleetHealth) as any[], damageData = safe(damage) as any[]
    const leavesData = safe(leaves) as any[], workforceData = safe(workforce)

    const now = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    return `
คุณคือ "LogisPro AI Admin" ผู้ช่วยอัจฉริยะระบบ TMS
เวลาปัจจุบัน: ${now} | ผู้ใช้งาน: ${userName} | สาขา: ${branchId || 'ทุกสาขา'}

═══════════════════════════════════════════════════════
📦 ข้อมูลงานวันนี้
- งานทั้งหมด: ${today?.todayJobCount ?? 0} รายการ
- กำลังวิ่ง: ${today?.stats?.active ?? 0} | เสร็จ: ${today?.stats?.completed ?? 0} | รอ: ${today?.stats?.pending ?? 0}
- งานล่าสุด: ${JSON.stringify(today?.jobs ?? [])}

💰 ข้อมูลการเงิน
- รายได้: ฿${fin?.revenue?.toLocaleString() ?? 0}
- กำไรสุทธิ: ฿${fin?.netProfit?.toLocaleString() ?? 0} (Margin: ${fin?.margin?.toFixed(1) ?? 0}%)

👨‍✈️ พนักงานขับรถ
- ทั้งหมด: ${drivers?.length ?? 0} คน (Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0})
- ตัวอย่าง: ${drivers?.slice(0, 5).map((d: any) => d.name).join(', ')}

🚛 ยานพาหนะ
- ทั้งหมด: ${vehicles?.length ?? 0} คัน (Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0})
- ทะเบียน: ${vehicles?.slice(0, 5).map((v: any) => v.plate).join(', ')}

🔧 การซ่อมบำรุง & สุขภาพรถ
- รอซ่อม: ${repairs?.length ?? 0} รายการ
- Fleet Alert: ${health?.length ?? 0} รายการ (${health?.slice(0, 2).map((h: any) => `${h.vehicle}:${h.alert}`).join(', ')})

⛽ น้ำมัน & อื่นๆ
- ค่าน้ำมัน: ฿${fuelData?.totalFuelCost?.toLocaleString() ?? 0} (${fuelData?.totalLiters?.toFixed(0) ?? 0} ลิตร)
- สินค้าเสียหาย: ${damageData?.length ?? 0} รายการ
- การลา: ${leavesData?.length ?? 0} รายการ (รออนุมัติ: ${leavesData?.filter((l: any) => l.status === 'Pending').length ?? 0})

📊 Workforce Analytics: ${JSON.stringify(workforceData ?? {})}

═══════════════════════════════════════════════════════
📌 คำแนะนำการตอบ
- ตอบเป็นภาษาไทยอย่างมืออาชีพ กระชับ แต่ครบถ้วน
- หากเป็นผู้บริหาร (Executive) ให้เน้นข้อมูลเชิงสรุปและการวิเคราะห์
- หากเป็นพนักงานขับรถ ให้เน้นข้อมูลที่เกี่ยวข้องกับการปฏิบัติงาน
- ตอบให้น่าอ่าน ใช้ Emoji ประกอบได้ตามความเหมาะสม
`.trim()
}

/**
 * Call Gemini with Tool support
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) return null
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Define tools for Gemini
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "create_job",
                    description: "สร้างงานขนส่งใหม่ในระบบ",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            customerName: { type: "STRING", description: "ชื่อลูกค้า" },
                            planDate: { type: "STRING", description: "วันที่วางแผน (YYYY-MM-DD)" },
                            routeName: { type: "STRING", description: "ชื่อเส้นทาง" },
                            price: { type: "NUMBER", description: "ราคาค่าขนส่ง" },
                            notes: { type: "STRING", description: "หมายเหตุเพิ่มเติม" }
                        },
                        required: ["customerName"]
                    }
                },
                {
                    name: "create_fuel_log",
                    description: "บันทึกข้อมูลการเติมน้ำมัน",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            plate: { type: "STRING", description: "ทะเบียนรถ" },
                            liters: { type: "NUMBER", description: "จำนวนลิตร" },
                            price: { type: "NUMBER", description: "ราคารวม" },
                            odometer: { type: "NUMBER", description: "เลขไมล์" },
                            station: { type: "STRING", description: "ชื่อปั๊ม" }
                        },
                        required: ["plate", "liters", "price"]
                    }
                },
                {
                    name: "create_damage_report",
                    description: "บันทึกการแจ้งสินค้าเสียหาย",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            jobId: { type: "STRING", description: "หมายเลขงาน" },
                            description: { type: "STRING", description: "รายละเอียดความเสียหาย" },
                            estimatedCost: { type: "NUMBER", description: "ประเมินค่าเสียหาย" }
                        },
                        required: ["jobId", "description"]
                    }
                }
            ]
        }
    ]

    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                tools: tools as any
            })

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: "รับทราบครับ ผมพร้อมช่วยเหลือในฐานะ LogisPro AI Admin แล้วครับ" }] }
                ]
            })

            const result = await chat.sendMessage(`คำถาม/คำสั่งจากผู้ใช้: ${userMessage}`)
            const response = result.response
            const parts = response.candidates?.[0].content.parts || []
            
            // Handle Tool Calls
            let foundTool = false
            for (const part of parts) {
                if (part.functionCall) {
                    foundTool = true
                    const { name, args } = part.functionCall
                    console.log(`[AI Tool Call] Executing: ${name}`, args)
                    
                    if (aiToolExecutors[name]) {
                        const toolResult = await aiToolExecutors[name](args)
                        const finalResult = await chat.sendMessage([{
                            functionResponse: {
                                name,
                                response: { content: toolResult }
                            }
                        }])
                        return finalResult.response.text()
                    }
                }
            }

            return response.text()
        } catch (err: any) {
            console.error(`Gemini (${modelName}) failed:`, err)
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
            const replyToken = event.replyToken
            const userId = event.source.userId
            if (!replyToken || !userId) continue

            // 0. FETCH IDENTITIES
            const [{ data: boundCustomer }, { data: boundDriver }, { data: boundAdmin }] = await Promise.all([
                supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Line_User_ID', userId).maybeSingle(),
                supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate').eq('Line_User_ID', userId).maybeSingle(),
                supabase.from('Master_Users').select('Username, Name, Role, Role_ID, Branch_ID').eq('Line_User_ID', userId).maybeSingle()
            ])

            const userName = boundAdmin?.Name || boundDriver?.Driver_Name || boundCustomer?.Customer_Name || 'ผู้ใช้'
            const branchId = boundAdmin?.Branch_ID || undefined

            // ----------------------------------------------------------------
            // CASE A: TEXT MESSAGE
            // ----------------------------------------------------------------
            if (event.type === 'message' && event.message.type === 'text') {
                const rawText = event.message.text.trim()
                const text = rawText.toUpperCase()

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
                        '🔹 ส่ง "เสียง" หรือ "รูปใบเสร็จ" ให้ AI ช่วยคีย์ได้! 🎙️📸',
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
                            await supabase.from('Master_Users').update({ Line_User_ID: userId }).eq('Username', adminUser.Username)
                            const welcomeMsg = `ยินดีต้อนรับคุณ ${adminUser.Name} ผูกบัญชีสำเร็จแล้ว!`
                            await replyToUser(replyToken, welcomeMsg)
                            continue
                        }
                    }
                    await replyToUser(replyToken, 'ไม่พบข้อมูลในระบบ หรือข้อมูลยืนยันไม่ถูกต้อง')
                    continue
                }

                // 3. LOGIC FOR BOUND USERS
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
                        const { error } = await supabase.from('Jobs_Main').update({ Job_Status: 'In Progress' }).eq('Job_ID', jobId).eq('Driver_ID', boundDriver.Driver_ID)
                        await replyToUser(replyToken, error ? `ไม่สามารถเริ่มงานได้: ${error.message}` : `เริ่มงาน ${jobId} เรียบร้อย! ขอให้เดินทางปลอดภัยครับ`)
                        continue
                    }
                }

                if (text.startsWith('JOB-')) {
                    const { data: job } = await supabase.from('Jobs_Main').select('*').ilike('Job_ID', text.trim()).maybeSingle()
                    if (job) {
                        await replyToUser(replyToken, `งาน: ${job.Job_ID}\nลูกค้า: ${job.Customer_Name}\nสถานะ: ${job.Job_Status}`)
                        continue
                    }
                }

                // AI FALLBACK FOR TEXT (FOR ALL BOUND USERS)
                if (boundAdmin || boundDriver || boundCustomer) {
                    const systemPrompt = await buildAdminAIContext(branchId, userName)
                    const aiResponse = await callGemini(systemPrompt, rawText)
                    if (aiResponse) {
                        await replyToUser(replyToken, aiResponse)
                    } else {
                        await replyToUser(replyToken, 'ขออภัยครับ AI ไม่สามารถตอบคำถามนี้ได้ในขณะนี้')
                    }
                    continue
                }
            }

            // ----------------------------------------------------------------
            // CASE B: AUDIO MESSAGE (Voice to Action)
            // ----------------------------------------------------------------
            if (event.type === 'message' && event.message.type === 'audio') {
                if (!boundAdmin && !boundDriver) {
                    await replyToUser(replyToken, 'ขออภัยครับ ฟีเจอร์สั่งงานด้วยเสียงเปิดให้เฉพาะแอดมินและคนขับครับ')
                    continue
                }

                try {
                    const audioBuffer = await getMessageContent(event.message.id)
                    const systemContext = await buildAdminAIContext(branchId, userName)
                    const systemPrompt = `
${systemContext}
คุณได้รับข้อความเสียงจากผู้ใช้ ให้ทำดังนี้:
1. แปลความหมายจากเสียงเป็นข้อความ
2. หากผู้ใช้สั่ง "สร้างงาน" ให้ใช้เครื่องมือ create_job
3. หากผู้ใช้บอกข้อมูล "เติมน้ำมัน" ให้ใช้เครื่องมือ create_fuel_log
4. ตอบกลับผู้ใช้ว่าคุณได้ทำอะไรไปบ้าง
`.trim()
                    
                    const aiResponse = await callGeminiMultimodal(systemPrompt, "วิเคราะห์เสียงนี้", "audio/x-m4a", audioBuffer)
                    if (aiResponse) {
                        await replyToUser(replyToken, aiResponse)
                    } else {
                        await replyToUser(replyToken, 'AI ไม่สามารถสรุปคำสั่งเสียงได้ครับ')
                    }
                } catch (err) {
                    console.error('Audio processing error:', err)
                    await replyToUser(replyToken, 'เกิดข้อผิดพลาดในการประมวลผลเสียง')
                }
                continue
            }

            // ----------------------------------------------------------------
            // CASE C: IMAGE MESSAGE (Photo Analysis)
            // ----------------------------------------------------------------
            if (event.type === 'message' && event.message.type === 'image') {
                if (!boundAdmin && !boundDriver) continue

                try {
                    const imageBuffer = await getMessageContent(event.message.id)
                    const systemContext = await buildAdminAIContext(branchId, userName)
                    const systemPrompt = `${systemContext}\nวิเคราะห์รูปภาพที่ได้รับ (เช่น ใบเสร็จน้ำมัน, รูปสินค้าเสียหาย) และสรุปข้อมูลสำคัญ`.trim()

                    const aiResponse = await callGeminiMultimodal(systemPrompt, "วิเคราะห์รูปภาพนี้", "image/jpeg", imageBuffer)
                    if (aiResponse) {
                        await replyToUser(replyToken, aiResponse)
                    } else {
                        await replyToUser(replyToken, 'AI ไม่สามารถวิเคราะห์รูปภาพนี้ได้ครับ')
                    }
                } catch (err) {
                    console.error('Image processing error:', err)
                    await replyToUser(replyToken, 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ')
                }
                continue
            }

            // Unbound user fallback
            if (!boundCustomer && !boundDriver && !boundAdmin) {
                await replyToUser(replyToken, 'กรุณาพิมพ์ BIND [รหัส] [เบอร์โทร] เพื่อเริ่มต้นใช้งานครับ')
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
