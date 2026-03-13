import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

import { replyToUser, verifyLineSignature } from '@/lib/integrations/line'

/**
 * LINE Chatbot Webhook
 * Handles customer inquiries about shipment status and location.
 */
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text()
        const signature = req.headers.get('x-line-signature') || ''
        
        // 1. Validate Signature
        if (!verifyLineSignature(bodyText, signature)) {
            console.warn('Unauthorized LINE Webhook attempt')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const body = JSON.parse(bodyText)
        const events = body.events || []

        const supabase = createAdminClient()

        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const text = event.message.text.trim().toUpperCase()
                const replyToken = event.replyToken
                const userId = event.source.userId
                
                // 1. HELP / MENU
                if (text === 'HELP' || text === 'MENU' || text === 'เมนู' || text === 'ช่วยเหลือ') {
                    const menu = `🤖 ยินดีต้อนรับสู่ TMS Intelligence Bot\n\n🔹 พิมพ์ "JOB-[ตามด้วยหมายเลข]" เพื่อเช็คสถานะและพิกัดงาน\n🔹 พิมพ์ "SUMMARY" หรือ "สรุป" เพื่อดูงานทั้งหมดของคุณวันนี้\n🔹 พิมพ์ "BIND [รหัสลูกค้า] [เบอร์โทร]" เพื่อผูกบัญชีเข้ากับระบบ\n   ตัวอย่าง: BIND CUST-2603-0001 0812345678\n🔹 พิมพ์ "MENU" เพื่อดูรายการคำสั่งนี้อีกครั้ง`
                    await replyToUser(replyToken, menu)
                    continue
                }

                // 2. SELF-BINDING (New Feature)
                if (text.startsWith('BIND ')) {
                    const parts = text.split(' ')
                    if (parts.length < 3) {
                        await replyToUser(replyToken, `❌ รูปแบบไม่ถูกต้อง\nกรุณาพิมพ์: BIND [รหัสลูกค้า] [เบอร์โทร]`)
                        continue
                    }

                    const custId = parts[1]
                    const phone = parts[2]

                    const { data: customer, error: findError } = await supabase
                        .from('Master_Customers')
                        .select('Customer_ID, Customer_Name')
                        .eq('Customer_ID', custId)
                        .eq('Phone', phone)
                        .single()

                    if (findError || !customer) {
                        await replyToUser(replyToken, `❌ ไม่พบข้อมูลลูกค้านี้ในระบบ หรือรหัส/เบอร์โทรไม่ถูกต้อง`)
                        continue
                    }

                    const { error: updateError } = await supabase
                        .from('Master_Customers')
                        .update({ Line_User_ID: userId })
                        .eq('Customer_ID', custId)

                    if (updateError) {
                        await replyToUser(replyToken, `❌ เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้ง`)
                        continue
                    }

                    await replyToUser(replyToken, `✅ ยินดีด้วยครับ! คุณ ${customer.Customer_Name} ได้ผูกบัญชีกับ LINE สำเร็จแล้ว\nตอนนี้คุณสามารถพิมพ์ "สรุป" เพื่อดูงานวันนี้ได้ทันทีครับ`)
                    continue
                }

                // 3. TODAY'S SUMMARY (Customer-bound)
                if (text === 'SUMMARY' || text === 'สรุป') {
                    // Find customer by Line_User_ID
                    const { data: customer } = await supabase
                        .from('Master_Customers')
                        .select('Customer_ID, Customer_Name')
                        .eq('Line_User_ID', userId)
                        .single()

                    if (!customer) {
                        await replyToUser(replyToken, `⚠️ บัญชี LINE ของคุณยังไม่ได้ผูกกับระบบครับ\n\n💡 วิธีผูกบัญชี:\nพิมพ์ BIND [รหัสลูกค้า] [เบอร์โทรที่ลงทะเบียนไว้]\n\nตัวอย่าง: BIND CUST-2603-0001 0812345678`)
                        continue
                    }

                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
                    const { data: jobs } = await supabase
                        .from('Jobs_Main')
                        .select('Job_Status')
                        .eq('Customer_ID', customer.Customer_ID)
                        .eq('Plan_Date', today)

                    if (!jobs || jobs.length === 0) {
                        await replyToUser(replyToken, `📦 สำหรับคุณ ${customer.Customer_Name}\nวันนี้ยังไม่มีรายการขนส่งในระบบครับ`)
                        continue
                    }

                    const total = jobs.length
                    const done = jobs.filter(j => ['Delivered', 'Completed'].includes(j.Job_Status)).length
                    const summary = `📋 สรุปงานวันนี้ (${customer.Customer_Name})\n\nทั้งหมด: ${total} รายการ\nสำเร็จแล้ว: ${done} ✅\nรอดำเนินการ: ${total - done} ⏳`
                    await replyToUser(replyToken, summary)
                    continue
                }

                // 3. JOB TRACKING (Enhanced)
                if (text.startsWith('JOB-')) {
                    const { data: job, error } = await supabase
                        .from('Jobs_Main')
                        .select('Job_Status, Customer_Name, Driver_ID, Driver_Name, Updated_At')
                        .eq('Job_ID', text)
                        .single()

                    if (error || !job) {
                        await replyToUser(replyToken, `❌ ไม่พบข้อมูลงานหมายเลข: ${text}`)
                        continue
                    }

                    // Get Driver location & Contact if in progress
                    let extraInfo = ''
                    if (job.Driver_ID) {
                        const { data: driver } = await supabase
                            .from('Master_Drivers')
                            .select('Mobile_No')
                            .eq('Driver_ID', job.Driver_ID)
                            .single()
                        
                        if (driver?.Mobile_No) {
                            extraInfo += `\n📞 ติดต่อคนขับ (${job.Driver_Name}): ${driver.Mobile_No}`
                        }

                        if (job.Job_Status === 'In Progress' || job.Job_Status === 'In Transit') {
                            const { data: gps } = await supabase
                                .from('GPS_Logs')
                                .select('Latitude, Longitude')
                                .eq('Driver_ID', job.Driver_ID)
                                .order('Timestamp', { ascending: false })
                                .limit(1)
                                .single()
                            
                            if (gps) {
                                extraInfo += `\n📍 พิกัดปัจจุบัน: https://www.google.com/maps?q=${gps.Latitude},${gps.Longitude}`
                            }
                        }
                    }

                    const reply = `🔍 ข้อมูลงาน: ${text}\n👤 ลูกค้า: ${job.Customer_Name}\n📦 สถานะ: ${job.Job_Status}\n🕒 อัปเดตล่าสุด: ${new Date(job.Updated_At).toLocaleString('th-TH')}${extraInfo}`
                    
                    await replyToUser(replyToken, reply)
                }
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
