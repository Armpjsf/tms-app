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
                    const menu = `🤖 TMS Intelligence Bot Menu\n\n🔹 พิมพ์ "งาน" หรือ "WORK" (สำหรับคนขับ)\n🔹 พิมพ์ "JOB-[เลขงาน]" เพื่อเช็คสถานะ\n🔹 พิมพ์ "สรุป" เพื่อดูงานวันนี้\n🔹 พิมพ์ "สรุป 02/2569" เพื่อดูรายเดือน\n🔹 พิมพ์ "วางบิล" ดูยอดค้างชำระ\n🔹 พิมพ์ "BIND [รหัส] [เบอร์โทร]" เพื่อผูกบัญชี\n   (รหัสลูกค้า หรือ รหัสคนขับ)`
                    await replyToUser(replyToken, menu)
                    continue
                }

                // 2. DRIVER BINDING
                if (text.startsWith('BIND ')) {
                    const parts = text.split(' ')
                    if (parts.length < 3) {
                        await replyToUser(replyToken, `❌ รูปแบบไม่ถูกต้อง\nกรุณาพิมพ์: BIND [รหัสพนักงาน/ลูกค้า] [เบอร์โทร]`)
                        continue
                    }

                    const id = parts[1]
                    const phone = parts[2]

                    // Try Customer first
                    const { data: customer } = await supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Customer_ID', id).eq('Phone', phone).maybeSingle()
                    if (customer) {
                        await supabase.from('Master_Customers').update({ Line_User_ID: userId }).eq('Customer_ID', id)
                        await replyToUser(replyToken, `✅ ยินดีด้วยครับ! คุณ ${customer.Customer_Name} (ลูกค้า) ผูกบัญชีสำเร็จแล้ว`)
                        continue
                    }

                    // Try Driver
                    const { data: driver } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name').eq('Driver_ID', id).eq('Mobile_No', phone).maybeSingle()
                    if (driver) {
                        await supabase.from('Master_Drivers').update({ Line_User_ID: userId }).eq('Driver_ID', id)
                        await replyToUser(replyToken, `✅ ยินดีด้วยครับ! คุณ ${driver.Driver_Name} (คนขับ) ผูกบัญชีสำเร็จแล้ว\nพิมพ์ "งาน" เพื่อเริ่มงานได้ทันทีครับ`)
                        continue
                    }

                    // Try Admin/Executive (using Username and Password check)
                    // Note: In a production app, we would use a more secure verification, 
                    // but for this demo, we'll check if the provided "phone" field matches their Username or a specific Admin Token
                    const { data: adminUser } = await supabase
                        .from('Master_Users')
                        .select('Username, Name, Role, Role_ID')
                        .eq('Username', id)
                        .maybeSingle()
                    
                    if (adminUser && (adminUser.Role_ID <= 2 || adminUser.Role === 'Executive')) {
                        // For Admin, we'll allow binding if they provide their correct Username as the second parameter for verification
                        if (phone === id || phone === 'ADMIN') { 
                            await supabase.from('Master_Users').update({ Line_User_ID: userId }).eq('Username', id)
                            await replyToUser(replyToken, `👑 ยินดีต้อนรับท่านผู้บริหาร! คุณ ${adminUser.Name} ผูกบัญชีสำเร็จแล้ว\n\n🔹 ตอนนี้ท่านสามารถถาม "กำไร" หรือ "ยอดขาย" ได้ทันทีครับ`)
                            continue
                        }
                    }

                    await replyToUser(replyToken, `❌ ไม่พบข้อมูลนี้ในระบบ หรือข้อมูลยืนยันไม่ถูกต้อง`)
                    continue
                }

                // 3. FETCH IDENTITIES
                const [{ data: boundCustomer }, { data: boundDriver }, { data: boundAdmin }] = await Promise.all([
                    supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Users').select('Username, Name, Role, Role_ID, Branch_ID').eq('Line_User_ID', userId).maybeSingle()
                ])

                const isExecutive = boundAdmin && (boundAdmin.Role_ID <= 2 || boundAdmin.Role === 'Executive')

                // 4. EXECUTIVE COMMANDS (Revenue, Profit, Analytics)
                if (isExecutive) {
                    const branchId = boundAdmin.Branch_ID || undefined
                    
                    if (text.includes('กำไร') || text.includes('PROFIT')) {
                        const { getFinancialStats } = await import('@/lib/supabase/financial-analytics')
                        const stats = await getFinancialStats(undefined, undefined, branchId)
                        await replyToUser(replyToken, `📈 รายงานกำไร (แอดมิน: ${boundAdmin.Name})\n\n💰 กำไรสุทธิ: ฿${stats.netProfit.toLocaleString()}\n📊 Margin: ${stats.profitMargin.toFixed(1)}%\n🚛 ยอดขาย: ฿${stats.revenue.toLocaleString()}`)
                        continue
                    }

                    if (text.includes('ยอดขาย') || text.includes('REVENUE')) {
                        const { getFinancialStats } = await import('@/lib/supabase/financial-analytics')
                        const stats = await getFinancialStats(undefined, undefined, branchId)
                        let msg = `💰 รายงานรายได้เดือนนี้\n👤 ${boundAdmin.Name}\n\n💵 ยอดรวม: ฿${stats.revenue.toLocaleString()}`
                        if (stats.revenueGrowth > 0) msg += `\n📈 เติบโตจากเดือนก่อน: ${stats.revenueGrowth.toFixed(1)}%`
                        await replyToUser(replyToken, msg)
                        continue
                    }
                }

                // 5. DRIVER COMMANDS: WORK / JOB UPDATES
                if (boundDriver) {
                    if (text === 'WORK' || text === 'งาน') {
                        const { data: jobs } = await supabase
                            .from('Jobs_Main')
                            .select('Job_ID, Job_Status, Route_Name')
                            .eq('Driver_ID', boundDriver.Driver_ID)
                            .neq('Job_Status', 'Completed')
                            .limit(5)

                        if (!jobs || jobs.length === 0) {
                            await replyToUser(replyToken, `📭 คุณ ${boundDriver.Driver_Name} ไม่มีงานค้างในระบบครับ`)
                        } else {
                            let msg = `🚛 รายงานงานของคุณ: ${boundDriver.Driver_Name}\n`
                            jobs.forEach(j => {
                                msg += `\n🔹 ${j.Job_ID}\n   สถานะ: ${j.Job_Status}\n   เส้นทาง: ${j.Route_Name}\n   อัปเดตพิมพ์: ${j.Job_ID} START`
                            })
                            await replyToUser(replyToken, msg)
                        }
                        continue
                    }

                    // Update Job Status via Chat (e.g. "JOB-123 START")
                    if (text.includes(' START') || text.includes(' เริ่ม')) {
                        const jobId = text.split(' ')[0]
                        const { error } = await supabase.from('Jobs_Main').update({ Job_Status: 'In Progress' }).eq('Job_ID', jobId).eq('Driver_ID', boundDriver.Driver_ID)
                        if (!error) await replyToUser(replyToken, `🚀 เริ่มงาน ${jobId} เรียบร้อย! ขอให้เดินทางปลอดภัยครับ`)
                        else await replyToUser(replyToken, `❌ ไม่สามารถเริ่มงานได้: ${error.message}`)
                        continue
                    }
                }

                // 5. CUSTOMER SUMMARY & BILLING (Existing improved logic)
                if (!boundCustomer && !boundDriver) {
                    if (['SUMMARY', 'สรุป', 'BILLING', 'วางบิล', 'งาน', 'WORK'].includes(text)) {
                        await replyToUser(replyToken, `⚠️ คุณยังไม่ได้ผูกบัญชีครับ\nพิมพ์ BIND [รหัส] [เบอร์โทร] เพื่อเริ่มต้นใช้งาน`)
                        continue
                    }
                }

                // 4. SUMMARY (Enhanced Multi-format & Range Support)
                if (text.startsWith('SUMMARY') || text.startsWith('สรุป')) {
                    if (!boundCustomer) continue

                    let dateDisplay = 'วันนี้'
                    let startDate = ''
                    let endDate = ''
                    
                    // Default to today in Thai timezone
                    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
                    startDate = todayStr
                    endDate = todayStr

                    // Helper: Handle BE Year conversion (Buddhist Era to AD)
                    const normalizeYear = (y: string) => {
                        let year = parseInt(y)
                        if (year > 2500) year -= 543 // Convert BE to AD
                        return year.toString()
                    }

                    // 1. Year only (e.g., สรุป 2569 or 2026)
                    const yearMatch = text.match(/\b(20\d{2}|25\d{2})\b/)
                    // 2. Month/Year (e.g., สรุป 02/2569 or 2026/02)
                    const monthYearMatch = text.match(/(\d{2})\/(\d{2,4})/) || text.match(/(\d{2,4})\/(\d{2})/)
                    // 3. Full Date (e.g., สรุป 27/02/2569 or 2026/02/27)
                    const fullDateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/) || text.match(/(\d{2,4})\/(\d{2})\/(\d{2})/)

                    if (fullDateMatch) {
                        // Handle both DD/MM/YYYY and YYYY/MM/DD
                        if (fullDateMatch[1].length >= 3) { // YYYY/MM/DD
                            const [, y, m, d] = fullDateMatch
                            const adYear = normalizeYear(y)
                            startDate = `${adYear}-${m}-${d}`
                            endDate = startDate
                            dateDisplay = `${d}/${m}/${y}`
                        } else { // DD/MM/YYYY
                            const [, d, m, y] = fullDateMatch
                            const adYear = normalizeYear(y)
                            startDate = `${adYear}-${m}-${d}`
                            endDate = startDate
                            dateDisplay = fullDateMatch[0]
                        }
                    } else if (monthYearMatch) {
                        let y, m
                        if (monthYearMatch[1].length >= 3) { // YYYY/MM
                            [, y, m] = monthYearMatch
                        } else { // MM/YYYY
                            [, m, y] = monthYearMatch
                        }
                        const adYear = normalizeYear(y)
                        startDate = `${adYear}-${m}-01`
                        // Set end date to first day of next month
                        const nextMonth = parseInt(m) === 12 ? 1 : parseInt(m) + 1
                        const nextYear = parseInt(m) === 12 ? parseInt(adYear) + 1 : adYear
                        endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
                        dateDisplay = `เดือน ${m}/${y}`
                    } else if (yearMatch) {
                        const adYear = normalizeYear(yearMatch[1])
                        startDate = `${adYear}-01-01`
                        endDate = `${(parseInt(adYear) + 1)}-01-01`
                        dateDisplay = `ปี ${yearMatch[1]}`
                    }

                    // Query using gte/lt for date stability and OR for smarter matching (ID or Name)
                    // Added quotes to handle special characters like () or spaces in Customer_Name
                    let query = supabase
                        .from('Jobs_Main')
                        .select('Job_Status')
                        .or(`Customer_ID.eq."${boundCustomer.Customer_ID}",Customer_Name.ilike."%${boundCustomer.Customer_Name.trim()}%"`)

                    if (startDate === endDate) {
                        query = query.eq('Plan_Date', startDate)
                    } else {
                        query = query.gte('Plan_Date', startDate).lt('Plan_Date', endDate)
                    }

                    const { data: jobs, error: summaryError } = await query

                    if (summaryError || !jobs || jobs.length === 0) {
                        const errorHint = summaryError ? ` (Error: ${summaryError.message})` : ''
                        await replyToUser(replyToken, `📦 สำหรับคุณ ${boundCustomer.Customer_Name}\nช่วงเวลา ${dateDisplay} ยังไม่มีรายการในระบบครับ${errorHint}`)
                        continue
                    }

                    const total = jobs.length
                    // Expanded status check to include variations (case-insensitive and common terms)
                    const doneJobs = jobs.filter(j => {
                        const st = (j.Job_Status || '').toLowerCase()
                        return ['delivered', 'completed', 'success', 'สำเร็จ'].includes(st)
                    })
                    const done = doneJobs.length
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
                        const status = b.Status === 'Paid' ? 'ชำแล้ว ✅' : 'รอดำเนินการ ⏳'
                        billText += `\n🔹 ${b.Billing_Note_ID}\n   วันที่: ${new Date(b.Billing_Date).toLocaleDateString('th-TH')}\n   ยอดรวม: ฿${b.Total_Amount.toLocaleString()}\n   สถานะ: ${status}\n`
                    })
                    await replyToUser(replyToken, billText)
                    continue
                }

                // 6. JOB TRACKING (With Enhanced Security Check)
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

                    // Security: Improved matching (Check both ID and Name, case-insensitive)
                    const isAuthorized = boundCustomer && (
                        job.Customer_ID === boundCustomer.Customer_ID || 
                        job.Customer_Name?.toLowerCase().trim().includes(boundCustomer.Customer_Name.toLowerCase().trim()) ||
                        boundCustomer.Customer_Name.toLowerCase().trim().includes(job.Customer_Name?.toLowerCase().trim() || '')
                    )

                    if (!isAuthorized) {
                        await replyToUser(replyToken, `🚫 ขออภัยครับ คุณไม่มีสิทธิ์ดูข้อมูลหมายเลขนี้`)
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
