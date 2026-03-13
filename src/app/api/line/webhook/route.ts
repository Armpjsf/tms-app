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
                    const menu = `🤖 ยินดีต้อนรับสู่ TMS Intelligence Bot\n\n🔹 พิมพ์ "JOB-[เลขงาน]" เพื่อเช็คสถานะและพิกัด\n🔹 พิมพ์ "สรุป" เพื่อดูงานวันนี้\n🔹 พิมพ์ "สรุป [วว/ดด/ปปปป]" เพื่อดูงานย้อนหลัง\n🔹 พิมพ์ "วางบิล" หรือ "BILLING" เพื่อดูยอดค้างชำระล่าสุด\n🔹 พิมพ์ "BIND [รหัสลูกค้า] [เบอร์โทร]" เพื่อผูกบัญชี\n🔹 พิมพ์ "MENU" เพื่อดูรายการคำสั่งนี้อีกครั้ง`
                    await replyToUser(replyToken, menu)
                    continue
                }

                // ... (BIND logic remains same)

                // 2. SELF-BINDING
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

                    await replyToUser(replyToken, `✅ ยินดีด้วยครับ! คุณ ${customer.Customer_Name} ได้ผูกบัญชีกับ LINE สำเร็จแล้ว\nตอนนี้คุณสามารถพิมพ์ "สรุป" เพื่อดูงานย้อนหลังได้ทันทีครับ`)
                    continue
                }

                // 3. CUSTOMER DATA FETCH (Required for all follow-up commands)
                const { data: boundCustomer } = await supabase
                    .from('Master_Customers')
                    .select('Customer_ID, Customer_Name')
                    .eq('Line_User_ID', userId)
                    .single()

                const isBindingQuery = text.startsWith('BIND ')
                if (!boundCustomer && !isBindingQuery) {
                    // Only prompt if they aren't trying to bind
                    if (text === 'SUMMARY' || text === 'สรุป' || text === 'BILLING' || text === 'วางบิล') {
                        await replyToUser(replyToken, `⚠️ บัญชี LINE ของคุณยังไม่ได้ผูกกับระบบครับ\n\n💡 วิธีผูกบัญชี:\nพิมพ์ BIND [รหัสลูกค้า] [เบอร์โทรที่ลงทะเบียนไว้]`)
                    } 
                }

                // 4. SUMMARY (With Date Filter)
                if (text.startsWith('SUMMARY') || text.startsWith('สรุป')) {
                    if (!boundCustomer) continue

                    let targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
                    let dateDisplay = 'วันนี้'

                    // Check for specific date format: "สรุป DD/MM/YYYY"
                    const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
                    if (dateMatch) {
                        const [full, day, month, year] = dateMatch
                        targetDate = `${year}-${month}-${day}`
                        dateDisplay = full
                    }

                    const { data: jobs } = await supabase
                        .from('Jobs_Main')
                        .select('Job_Status')
                        .eq('Customer_ID', boundCustomer.Customer_ID)
                        .eq('Plan_Date', targetDate)

                    if (!jobs || jobs.length === 0) {
                        await replyToUser(replyToken, `📦 สำหรับคุณ ${boundCustomer.Customer_Name}\nวันที่ ${dateDisplay} ยังไม่มีรายการในระบบครับ`)
                        continue
                    }

                    const total = jobs.length
                    const done = jobs.filter(j => ['Delivered', 'Completed'].includes(j.Job_Status)).length
                    const summary = `📋 สรุปงาน (${dateDisplay})\n👤 ${boundCustomer.Customer_Name}\n\nทั้งหมด: ${total} รายการ\nสำเร็จแล้ว: ${done} ✅\nรอดำเนินการ: ${total - done} ⏳`
                    await replyToUser(replyToken, summary)
                    continue
                }

                // 5. BILLING HISTORY
                if (text === 'BILLING' || text === 'วางบิล') {
                    if (!boundCustomer) continue

                    const { data: bills } = await supabase
                        .from('Billing_Notes')
                        .select('Billing_Note_ID, Billing_Date, Total_Amount, Status')
                        .eq('Customer_Name', boundCustomer.Customer_Name)
                        .order('Created_At', { ascending: false })
                        .limit(5)

                    if (!bills || bills.length === 0) {
                        await replyToUser(replyToken, `🧾 ยังไม่มีประวัติการวางบิลในระบบครับ`)
                        continue
                    }

                    let billText = `🧾 ประวัติการวางบิล 5 รายการล่าสุด\n👤 ${boundCustomer.Customer_Name}\n`
                    bills.forEach(b => {
                        const status = b.Status === 'Paid' ? 'ชำระแล้ว ✅' : 'รอดำเนินการ ⏳'
                        billText += `\n🔹 ${b.Billing_Note_ID}\n   วันที่: ${new Date(b.Billing_Date).toLocaleDateString('th-TH')}\n   ยอดรวม: ฿${b.Total_Amount.toLocaleString()}\n   สถานะ: ${status}\n`
                    })
                    await replyToUser(replyToken, billText)
                    continue
                }

                // 6. JOB TRACKING (With Security Check)
                if (text.startsWith('JOB-')) {
                    const { data: jobList, error: queryError } = await supabase
                        .from('Jobs_Main')
                        .select('*')
                        .ilike('Job_ID', text.trim())
                        .limit(1)

                    const job = jobList?.[0]

                    if (queryError || !job) {
                        const errorHint = queryError ? ` (Error: ${queryError.message})` : ''
                        await replyToUser(replyToken, `❌ ไม่พบข้อมูลงานหมายเลข: ${text}${errorHint}`)
                        continue
                    }

                    // Security: If user is bound to a customer, they can only see THEIR jobs
                    if (boundCustomer && job.Customer_ID !== boundCustomer.Customer_ID) {
                        await replyToUser(replyToken, `🚫 ขออภัยครับ คุณไม่มีสิทธิ์ดูข้อมูลงรายเลขานี้`)
                        continue
                    }

                    // Get Driver location & Contact if in progress
                    let extraInfo = ''
                    if (job.Driver_ID) {
                        const { data: driver } = await supabase
                            .from('Master_Drivers')
                            .select('Mobile_No')
                            .eq('Driver_ID', job.Driver_ID)
                            .limit(1)
                            .maybeSingle()
                        
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
                                .maybeSingle()
                            
                            if (gps) {
                                extraInfo += `\n📍 พิกัดปัจจุบัน: https://www.google.com/maps?q=${gps.Latitude},${gps.Longitude}`
                            }
                        }
                    }

                    const lastUpdate = job.Updated_At || job.Created_At || new Date().toISOString()
                    const reply = `🔍 ข้อมูลงาน: ${job.Job_ID}\n👤 ลูกค้า: ${job.Customer_Name}\n📦 สถานะ: ${job.Job_Status}\n🕒 อัปเดตล่าสุด: ${new Date(lastUpdate).toLocaleString('th-TH')}${extraInfo}`
                    
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
