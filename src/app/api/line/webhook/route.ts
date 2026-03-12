import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * LINE Chatbot Webhook
 * Handles customer inquiries about shipment status and location.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const events = body.events || []

        const supabase = await createClient()

        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const text = event.message.text.trim().toUpperCase()
                
                // Regex to match Job ID (e.g., JOB-12345)
                if (text.startsWith('JOB-')) {
                    const { data: job, error } = await supabase
                        .from('Jobs_Main')
                        .select('Job_Status, Customer_Name, Driver_ID, Updated_At')
                        .eq('Job_ID', text)
                        .single()

                    if (error || !job) {
                        // Reply: Job not found
                        console.log('Job not found:', text)
                        continue
                    }

                    // Get Driver location if in progress
                    let locationMsg = ''
                    if (job.Job_Status === 'In Progress' && job.Driver_ID) {
                        const { data: gps } = await supabase
                            .from('GPS_Logs')
                            .select('Latitude, Longitude')
                            .eq('Driver_ID', job.Driver_ID)
                            .order('Timestamp', { ascending: false })
                            .limit(1)
                            .single()
                        
                        if (gps) {
                            locationMsg = `\n📍 พิกัดปัจจุบัน: https://www.google.com/maps?q=${gps.Latitude},${gps.Longitude}`
                        }
                    }

                    const reply = `🔍 ข้อมูลงาน: ${text}\n👤 ลูกค้า: ${job.Customer_Name}\n📦 สถานะ: ${job.Job_Status}\n🕒 อัปเดตล่าสุด: ${new Date(job.Updated_At).toLocaleString('th-TH')}${locationMsg}`
                    
                    // Note: Here you would call LINE Messaging API to send the 'reply' back
                    console.log('LINE Reply:', reply)
                }
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
