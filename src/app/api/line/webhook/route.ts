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
 * Build a shared Admin AI system prompt using live system data
 */
async function buildAdminAIContext(branchId?: string): Promise<string> {
    const [todaySummary, financial, allDrivers, allVehicles, maintStats, pendingRepairs, fuel, fleetHealth, damage, leaves] = await Promise.allSettled([
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
    const today = safe(todaySummary), fin = safe(financial), drivers = safe(allDrivers) as any[], vehicles = safe(allVehicles) as any[]
    const mStats = safe(maintStats), repairs = safe(pendingRepairs) as any[], fuelData = safe(fuel), health = safe(fleetHealth) as any[]
    const damageData = safe(damage) as any[], leavesData = safe(leaves) as any[]

    const now = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    return `
à¸„à¸¸à¸“à¸„à¸·à¸­ "LogisPro AI Admin" à¸œà¸¹à¹‰à¸Šà¹ˆà¸§à¸¢à¸­à¸±à¸ˆà¸‰à¸£à¸´à¸¢à¸°à¸£à¸°à¸šà¸š TMS à¹€à¸§à¸¥à¸²: ${now}
ðŸ“¦ à¸‡à¸²à¸™à¸§à¸±à¸™à¸™à¸µà¹‰: ${today?.todayJobCount ?? 0} à¸£à¸²à¸¢à¸à¸²à¸£ | à¸à¸³à¸¥à¸±à¸‡à¸§à¸´à¹ˆà¸‡: ${today?.stats?.active ?? 0} | à¹€à¸ªà¸£à¹‡à¸ˆ: ${today?.stats?.completed ?? 0}
ðŸ’° à¸£à¸²à¸¢à¹„à¸”à¹‰: à¸¿${fin?.revenue?.toLocaleString() ?? 0} | à¸à¸³à¹„à¸£: à¸¿${fin?.netProfit?.toLocaleString() ?? 0} | Margin: ${fin?.margin?.toFixed(1) ?? 0}%
ðŸ‘¨â€âœˆï¸ à¸„à¸™à¸‚à¸±à¸š: ${drivers?.length ?? 0} à¸„à¸™ (Active: ${drivers?.filter((d: any) => d.status === 'Active').length ?? 0})
ðŸš› à¸£à¸–: ${vehicles?.length ?? 0} à¸„à¸±à¸™ (Active: ${vehicles?.filter((v: any) => v.status === 'Active').length ?? 0})
ðŸ”§ à¸£à¸­à¸‹à¹ˆà¸­à¸¡: ${repairs?.length ?? 0} à¸£à¸²à¸¢à¸à¸²à¸£ | ${repairs?.slice(0, 3).map((r: any) => r.vehicle + ':' + r.problem).join(', ') ?? '-'}
â›½ à¸„à¹ˆà¸²à¸™à¹‰à¸³à¸¡à¸±à¸™: à¸¿${fuelData?.totalFuelCost?.toLocaleString() ?? 0} | ${fuelData?.totalLiters?.toFixed(0) ?? 0} à¸¥à¸´à¸•à¸£
ðŸš¨ Fleet Alerts: ${health?.length ?? 0} à¸£à¸²à¸¢à¸à¸²à¸£
ðŸ’¥ à¸ªà¸´à¸™à¸„à¹‰à¸²à¹€à¸ªà¸µà¸¢à¸«à¸²à¸¢: ${damageData?.length ?? 0} à¸£à¸²à¸¢à¸à¸²à¸£ (à¸£à¸­à¸•à¸£à¸§à¸ˆ: ${damageData?.filter((d: any) => d.status === 'Pending').length ?? 0})
ðŸ“… à¸à¸²à¸£à¸¥à¸²: ${leavesData?.length ?? 0} à¸£à¸²à¸¢à¸à¸²à¸£ (à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´: ${leavesData?.filter((l: any) => l.status === 'Pending').length ?? 0})
à¸•à¸­à¸šà¹€à¸›à¹‡à¸™à¸ à¸²à¸©à¸²à¹„à¸—à¸¢ à¸à¸£à¸°à¸Šà¸±à¸š à¸•à¸£à¸‡à¸›à¸£à¸°à¹€à¸”à¹‡à¸™ à¸«à¹‰à¸²à¸¡à¸¢à¸²à¸§à¹€à¸à¸´à¸™ 5 à¸šà¸£à¸£à¸—à¸±à¸”à¸ªà¸³à¸«à¸£à¸±à¸š LINE`.trim()
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
            const result = await model.generateContent([systemPrompt, `à¸„à¸³à¸–à¸²à¸¡: ${userMessage}`])
            return result.response.text()
        } catch (err: any) {
            if (!err.message?.includes('404')) break
        }
    }
    return null
}

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
                const rawText = event.message.text.trim()
                const replyToken = event.replyToken
                const userId = event.source.userId
                
                // 1. HELP / MENU
                if (text === 'HELP' || text === 'MENU' || text === 'à¹€à¸¡à¸™à¸¹' || text === 'à¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­') {
                    const menu = `ðŸ¤– LogisPro AI Bot Menu\n\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "à¸‡à¸²à¸™" à¸«à¸£à¸·à¸­ "WORK" (à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸™à¸‚à¸±à¸š)\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "JOB-[à¹€à¸¥à¸‚à¸‡à¸²à¸™]" à¹€à¸žà¸·à¹ˆà¸­à¹€à¸Šà¹‡à¸„à¸ªà¸–à¸²à¸™à¸°\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "à¸ªà¸£à¸¸à¸›" à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸‡à¸²à¸™à¸§à¸±à¸™à¸™à¸µà¹‰\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "à¸ªà¸£à¸¸à¸› 02/2569" à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸£à¸²à¸¢à¹€à¸”à¸·à¸­à¸™\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "à¸§à¸²à¸‡à¸šà¸´à¸¥" à¸”à¸¹à¸¢à¸­à¸”à¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°\nðŸ”¹ à¸žà¸´à¸¡à¸žà¹Œ "BIND [à¸£à¸«à¸±à¸ª] [à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£]" à¹€à¸žà¸·à¹ˆà¸­à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µ\nðŸ”¹ à¸«à¸£à¸·à¸­à¸–à¸²à¸¡à¹„à¸”à¹‰à¹€à¸¥à¸¢ à¹€à¸Šà¹ˆà¸™ "à¸§à¸±à¸™à¸™à¸µà¹‰à¸¡à¸µà¸‡à¸²à¸™à¸à¸µà¹ˆà¸‡à¸²à¸™?" ðŸ§  (AI)`
                    await replyToUser(replyToken, menu)
                    continue
                }

                // 2. DRIVER BINDING
                if (text.startsWith('BIND ')) {
                    const parts = text.split(' ')
                    if (parts.length < 3) {
                        await replyToUser(replyToken, `âŒ à¸£à¸¹à¸›à¹à¸šà¸šà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡\nà¸à¸£à¸¸à¸“à¸²à¸žà¸´à¸¡à¸žà¹Œ: BIND [à¸£à¸«à¸±à¸ªà¸žà¸™à¸±à¸à¸‡à¸²à¸™/à¸¥à¸¹à¸à¸„à¹‰à¸²] [à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£]`)
                        continue
                    }

                    const id = parts[1]
                    const phone = parts[2]

                    // Try Customer first
                    const { data: customer } = await supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Customer_ID', id).eq('Phone', phone).maybeSingle()
                    if (customer) {
                        await supabase.from('Master_Customers').update({ Line_User_ID: userId }).eq('Customer_ID', id)
                        await replyToUser(replyToken, `âœ… à¸¢à¸´à¸™à¸”à¸µà¸”à¹‰à¸§à¸¢à¸„à¸£à¸±à¸š! à¸„à¸¸à¸“ ${customer.Customer_Name} (à¸¥à¸¹à¸à¸„à¹‰à¸²) à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µà¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§`)
                        continue
                    }

                    // Try Driver
                    const { data: driver } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name').eq('Driver_ID', id).eq('Mobile_No', phone).maybeSingle()
                    if (driver) {
                        await supabase.from('Master_Drivers').update({ Line_User_ID: userId }).eq('Driver_ID', id)
                        await replyToUser(replyToken, `âœ… à¸¢à¸´à¸™à¸”à¸µà¸”à¹‰à¸§à¸¢à¸„à¸£à¸±à¸š! à¸„à¸¸à¸“ ${driver.Driver_Name} (à¸„à¸™à¸‚à¸±à¸š) à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µà¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§\nà¸žà¸´à¸¡à¸žà¹Œ "à¸‡à¸²à¸™" à¹€à¸žà¸·à¹ˆà¸­à¹€à¸£à¸´à¹ˆà¸¡à¸‡à¸²à¸™à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µà¸„à¸£à¸±à¸š`)
                        continue
                    }

                    // Try Admin/Executive (using Username or Phone check)
                    const { data: adminUser } = await supabase
                        .from('Master_Users')
                        .select('Username, Name, Role, Role_ID, Email')
                        .or(`Username.ilike.${id},Email.ilike.${id}`)
                        .maybeSingle()
                    
                    if (adminUser && (adminUser.Role_ID <= 2 || adminUser.Role === 'Executive' || adminUser.Role === 'Super Admin')) {
                        if (phone === id || phone === 'ADMIN' || phone === 'admin') { 
                            await supabase.from('Master_Users').update({ Line_User_ID: userId }).eq('Username', id)
                            
                            const isSuper = adminUser.Role_ID === 1 || adminUser.Role === 'Super Admin' || adminUser.Role === 'Executive'
                            const welcomeMsg = isSuper 
                                ? `ðŸ‘‘ à¸¢à¸´à¸™à¸”à¸µà¸•à¹‰à¸­à¸™à¸£à¸±à¸šà¸—à¹ˆà¸²à¸™à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£! à¸„à¸¸à¸“ ${adminUser.Name} à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µà¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§\n\nðŸ§  à¸•à¸­à¸™à¸™à¸µà¹‰à¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸–à¸²à¸¡ AI à¹„à¸”à¹‰à¸—à¸¸à¸à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸¥à¸¢à¸„à¸£à¸±à¸š à¹€à¸Šà¹ˆà¸™ "à¸à¸³à¹„à¸£à¹€à¸”à¸·à¸­à¸™à¸™à¸µà¹‰à¹€à¸—à¹ˆà¸²à¹„à¸«à¸£à¹ˆ?"`
                                : `ðŸ‘¨â€ðŸ’¼ à¸¢à¸´à¸™à¸”à¸µà¸•à¹‰à¸­à¸™à¸£à¸±à¸šà¸„à¸¸à¸“ ${adminUser.Name} (Staff/Admin)! à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µà¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§\n\nðŸ”¹ à¸„à¸¸à¸“à¸ªà¸²à¸¡à¸²à¸£à¸–à¸–à¸²à¸¡ AI à¸«à¸£à¸·à¸­à¹€à¸Šà¹‡à¸„à¸ªà¸–à¸²à¸™à¸°à¸‡à¸²à¸™à¹„à¸”à¹‰à¹‚à¸”à¸¢à¸žà¸´à¸¡à¸žà¹Œ JOB-[à¹€à¸¥à¸‚à¸‡à¸²à¸™] à¸„à¸£à¸±à¸š`
                            
                            await replyToUser(replyToken, welcomeMsg)
                            continue
                        }
                    }

                    await replyToUser(replyToken, `âŒ à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸™à¸µà¹‰à¹ƒà¸™à¸£à¸°à¸šà¸š à¸«à¸£à¸·à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¢à¸·à¸™à¸¢à¸±à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡`)
                    continue
                }

                // 3. FETCH IDENTITIES
                const [{ data: boundCustomer }, { data: boundDriver }, { data: boundAdmin }] = await Promise.all([
                    supabase.from('Master_Customers').select('Customer_ID, Customer_Name').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Vehicle_Plate').eq('Line_User_ID', userId).maybeSingle(),
                    supabase.from('Master_Users').select('Username, Name, Role, Role_ID, Branch_ID').eq('Line_User_ID', userId).maybeSingle()
                ])

                const isExecutive = boundAdmin && (boundAdmin.Role_ID === 1 || boundAdmin.Role === 'Executive' || boundAdmin.Role === 'Super Admin')

                // 4. EXECUTIVE COMMANDS (Revenue, Profit, Analytics)
                if (isExecutive) {
                    const branchId = boundAdmin.Branch_ID || undefined
                    
                    if (text.includes('à¸à¸³à¹„à¸£') || text.includes('PROFIT')) {
                        const { getFinancialStats } = await import('@/lib/supabase/financial-analytics')
                        const stats = await getFinancialStats(undefined, undefined, branchId)
                        await replyToUser(replyToken, `ðŸ“ˆ à¸£à¸²à¸¢à¸‡à¸²à¸™à¸à¸³à¹„à¸£ (à¹à¸­à¸”à¸¡à¸´à¸™: ${boundAdmin.Name})\n\nðŸ’° à¸à¸³à¹„à¸£à¸ªà¸¸à¸—à¸˜à¸´: à¸¿${stats.netProfit.toLocaleString()}\nðŸ“Š Margin: ${stats.profitMargin.toFixed(1)}%\nðŸš› à¸¢à¸­à¸”à¸‚à¸²à¸¢: à¸¿${stats.revenue.toLocaleString()}`)
                        continue
                    }

                    if (text.includes('à¸¢à¸­à¸”à¸‚à¸²à¸¢') || text.includes('REVENUE')) {
                        const { getFinancialStats } = await import('@/lib/supabase/financial-analytics')
                        const stats = await getFinancialStats(undefined, undefined, branchId)
                        await replyToUser(replyToken, `ðŸ’° à¸£à¸²à¸¢à¸‡à¸²à¸™à¸£à¸²à¸¢à¹„à¸”à¹‰à¹€à¸”à¸·à¸­à¸™à¸™à¸µà¹‰\nðŸ‘¤ ${boundAdmin.Name}\n\nðŸ’µ à¸¢à¸­à¸”à¸£à¸§à¸¡: à¸¿${stats.revenue.toLocaleString()}`)
                        continue
                    }
                }

                // 5. DRIVER COMMANDS: WORK / JOB UPDATES
                if (boundDriver) {
                    if (text === 'WORK' || text === 'à¸‡à¸²à¸™') {
                        const { data: jobs } = await supabase
                            .from('Jobs_Main')
                            .select('Job_ID, Job_Status, Route_Name')
                            .eq('Driver_ID', boundDriver.Driver_ID)
                            .neq('Job_Status', 'Completed')
                            .limit(5)

                        if (!jobs || jobs.length === 0) {
                            await replyToUser(replyToken, `ðŸ“­ à¸„à¸¸à¸“ ${boundDriver.Driver_Name} à¹„à¸¡à¹ˆà¸¡à¸µà¸‡à¸²à¸™à¸„à¹‰à¸²à¸‡à¹ƒà¸™à¸£à¸°à¸šà¸šà¸„à¸£à¸±à¸š`)
                        } else {
                            let msg = `ðŸš› à¸£à¸²à¸¢à¸‡à¸²à¸™à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸„à¸¸à¸“: ${boundDriver.Driver_Name}\n`
                            jobs.forEach(j => {
                                msg += `\nðŸ”¹ ${j.Job_ID}\n   à¸ªà¸–à¸²à¸™à¸°: ${j.Job_Status}\n   à¹€à¸ªà¹‰à¸™à¸—à¸²à¸‡: ${j.Route_Name}\n   à¸­à¸±à¸›à¹€à¸”à¸•à¸žà¸´à¸¡à¸žà¹Œ: ${j.Job_ID} START`
                            })
                            await replyToUser(replyToken, msg)
                        }
                        continue
                    }

                    // Update Job Status via Chat (e.g. "JOB-123 START")
                    if (text.includes(' START') || text.includes(' à¹€à¸£à¸´à¹ˆà¸¡')) {
                        const jobId = text.split(' ')[0]
                        const { error } = await supabase.from('Jobs_Main').update({ Job_Status: 'In Progress' }).eq('Job_ID', jobId).eq('Driver_ID', boundDriver.Driver_ID)
                        if (!error) await replyToUser(replyToken, `ðŸš€ à¹€à¸£à¸´à¹ˆà¸¡à¸‡à¸²à¸™ ${jobId} à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢! à¸‚à¸­à¹ƒà¸«à¹‰à¹€à¸”à¸´à¸™à¸—à¸²à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸„à¸£à¸±à¸š`)
                        else await replyToUser(replyToken, `âŒ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸£à¸´à¹ˆà¸¡à¸‡à¸²à¸™à¹„à¸”à¹‰: ${error.message}`)
                        continue
                    }
                }

                // 5. CUSTOMER SUMMARY & BILLING
                if (!boundCustomer && !boundDriver) {
                    if (['SUMMARY', 'à¸ªà¸£à¸¸à¸›', 'BILLING', 'à¸§à¸²à¸‡à¸šà¸´à¸¥', 'à¸‡à¸²à¸™', 'WORK'].includes(text)) {
                        await replyToUser(replyToken, `âš ï¸ à¸„à¸¸à¸“à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µà¸„à¸£à¸±à¸š\nà¸žà¸´à¸¡à¸žà¹Œ BIND [à¸£à¸«à¸±à¸ª] [à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£] à¹€à¸žà¸·à¹ˆà¸­à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™`)
                        continue
                    }
                }

                // 4. SUMMARY (Enhanced Multi-format & Range Support)
                if (text.startsWith('SUMMARY') || text.startsWith('à¸ªà¸£à¸¸à¸›')) {
                    if (!boundCustomer) continue

                    let dateDisplay = 'à¸§à¸±à¸™à¸™à¸µà¹‰'
                    let startDate = ''
                    let endDate = ''
                    
                    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
                    startDate = todayStr
                    endDate = todayStr

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
                            const adYear = normalizeYear(y)
                            startDate = `${adYear}-${m}-${d}`
                            endDate = startDate
                            dateDisplay = `${d}/${m}/${y}`
                        } else {
                            const [, d, m, y] = fullDateMatch
                            const adYear = normalizeYear(y)
                            startDate = `${adYear}-${m}-${d}`
                            endDate = startDate
                            dateDisplay = fullDateMatch[0]
                        }
                    } else if (monthYearMatch) {
                        let y, m
                        if (monthYearMatch[1].length >= 3) {
                            [, y, m] = monthYearMatch
                        } else {
                            [, m, y] = monthYearMatch
                        }
                        const adYear = normalizeYear(y)
                        startDate = `${adYear}-${m}-01`
                        const nextMonth = parseInt(m) === 12 ? 1 : parseInt(m) + 1
                        const nextYear = parseInt(m) === 12 ? parseInt(adYear) + 1 : adYear
                        endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
                        dateDisplay = `à¹€à¸”à¸·à¸­à¸™ ${m}/${y}`
                    } else if (yearMatch) {
                        const adYear = normalizeYear(yearMatch[1])
                        startDate = `${adYear}-01-01`
                        endDate = `${(parseInt(adYear) + 1)}-01-01`
                        dateDisplay = `à¸›à¸µ ${yearMatch[1]}`
                    }

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
                        await replyToUser(replyToken, `ðŸ“¦ à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸¸à¸“ ${boundCustomer.Customer_Name}\nà¸Šà¹ˆà¸§à¸‡à¹€à¸§à¸¥à¸² ${dateDisplay} à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£à¹ƒà¸™à¸£à¸°à¸šà¸šà¸„à¸£à¸±à¸š${errorHint}`)
                        continue
                    }

                    const total = jobs.length
                    const doneJobs = jobs.filter(j => {
                        const st = (j.Job_Status || '').toLowerCase()
                        return ['delivered', 'completed', 'success', 'à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'].includes(st)
                    })
                    const done = doneJobs.length
                    const summary = `ðŸ“‹ à¸ªà¸£à¸¸à¸›à¸‡à¸²à¸™ (${dateDisplay})\nðŸ‘¤ ${boundCustomer.Customer_Name}\n\nà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”: ${total} à¸£à¸²à¸¢à¸à¸²à¸£\nà¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§: ${done} âœ…\nà¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£: ${total - done} â³`
                    await replyToUser(replyToken, summary)
                    continue
                }

                // 5. BILLING HISTORY
                if (text === 'BILLING' || text === 'à¸§à¸²à¸‡à¸šà¸´à¸¥') {
                    if (!boundCustomer) continue

                    const { data: bills } = await supabase
                        .from('Billing_Notes')
                        .select('Billing_Note_ID, Billing_Date, Total_Amount, Status')
                        .eq('Customer_Name', boundCustomer.Customer_Name)
                        .order('Created_At', { ascending: false })
                        .limit(5)

                    if (!bills || bills.length === 0) {
                        await replyToUser(replyToken, `ðŸ§¾ à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸§à¸²à¸‡à¸šà¸´à¸¥à¹ƒà¸™à¸£à¸°à¸šà¸šà¸„à¸£à¸±à¸š`)
                        continue
                    }

                    let billText = `ðŸ§¾ à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸§à¸²à¸‡à¸šà¸´à¸¥ 5 à¸£à¸²à¸¢à¸à¸²à¸£à¸¥à¹ˆà¸²à¸ªà¸¸à¸”\nðŸ‘¤ ${boundCustomer.Customer_Name}\n`
                    bills.forEach(b => {
                        const status = b.Status === 'Paid' ? 'à¸Šà¸³à¹à¸¥à¹‰à¸§ âœ…' : 'à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£ â³'
                        billText += `\nðŸ”¹ ${b.Billing_Note_ID}\n   à¸§à¸±à¸™à¸—à¸µà¹ˆ: ${new Date(b.Billing_Date).toLocaleDateString('th-TH')}\n   à¸¢à¸­à¸”à¸£à¸§à¸¡: à¸¿${b.Total_Amount.toLocaleString()}\n   à¸ªà¸–à¸²à¸™à¸°: ${status}\n`
                    })
                    await replyToUser(replyToken, billText)
                    continue
                }

                // 6. JOB TRACKING
                if (text.startsWith('JOB-')) {
                    const { data: jobList, error: queryError } = await supabase
                        .from('Jobs_Main')
                        .select('*')
                        .ilike('Job_ID', text.trim())
                        .limit(1)

                    const job = jobList?.[0]

                    if (queryError || !job) {
                        const errorHint = queryError ? ` (Error: ${queryError.message})` : ''
                        await replyToUser(replyToken, `âŒ à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‡à¸²à¸™à¸«à¸¡à¸²à¸¢à¹€à¸¥à¸‚: ${text}${errorHint}`)
                        continue
                    }

                    const isAuthorized = boundAdmin || (boundCustomer && (
                        job.Customer_ID === boundCustomer.Customer_ID || 
                        job.Customer_Name?.toLowerCase().trim().includes(boundCustomer.Customer_Name.toLowerCase().trim()) ||
                        boundCustomer.Customer_Name.toLowerCase().trim().includes(job.Customer_Name?.toLowerCase().trim() || '')
                    ))

                    if (!isAuthorized) {
                        await replyToUser(replyToken, `ðŸš« à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¸£à¸±à¸š à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸”à¸¹à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸¡à¸²à¸¢à¹€à¸¥à¸‚à¸™à¸µà¹‰`)
                        continue
                    }

                    let extraInfo = ''
                    if (job.Driver_ID) {
                        const { data: driver } = await supabase
                            .from('Master_Drivers')
                            .select('Mobile_No')
                            .eq('Driver_ID', job.Driver_ID)
                            .limit(1)
                            .maybeSingle()
                        
                        if (driver?.Mobile_No) {
                            extraInfo += `\nðŸ“ž à¸•à¸´à¸”à¸•à¹ˆà¸­à¸„à¸™à¸‚à¸±à¸š (${job.Driver_Name}): ${driver.Mobile_No}`
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
                                extraInfo += `\nðŸ“ à¸žà¸´à¸à¸±à¸”à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™: https://www.google.com/maps?q=${gps.Latitude},${gps.Longitude}`
                            }
                        }
                    }

                    const lastUpdate = job.Updated_At || job.Created_At || new Date().toISOString()
                    const reply = `ðŸ” à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‡à¸²à¸™: ${job.Job_ID}\nðŸ‘¤ à¸¥à¸¹à¸à¸„à¹‰à¸²: ${job.Customer_Name}\nðŸ“¦ à¸ªà¸–à¸²à¸™à¸°: ${job.Job_Status}\nðŸ•’ à¸­à¸±à¸›à¹€à¸”à¸•à¸¥à¹ˆà¸²à¸ªà¸¸à¸”: ${new Date(lastUpdate).toLocaleString('th-TH')}${extraInfo}`
                    
                    await replyToUser(replyToken, reply)
                    continue
                }

                // ============================================================
                // 7. ðŸ§  AI FALLBACK - For all free-text questions
                //    Available for: Admin, Executive, and bound Drivers
                // ============================================================
                if (boundAdmin || boundDriver || isExecutive) {
                    try {
                        const branchId = boundAdmin?.Branch_ID || undefined
                        const userName = boundAdmin?.Name || boundDriver?.Driver_Name || 'à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™'
                        
                        const systemPrompt = await buildAdminAIContext(branchId)
                        const aiResponse = await callGemini(systemPrompt, rawText)
                        
                        if (aiResponse) {
                            await replyToUser(replyToken, `ðŸ§  AI Admin (${userName}):\n${aiResponse}`)
                        } else {
                            await replyToUser(replyToken, `ðŸ¤– à¸‚à¸­à¸­à¸ à¸±à¸¢à¸„à¸£à¸±à¸š à¸£à¸°à¸šà¸š AI à¸‚à¸±à¸”à¸‚à¹‰à¸­à¸‡à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§ à¸à¸£à¸¸à¸“à¸²à¸žà¸´à¸¡à¸žà¹Œ "à¹€à¸¡à¸™à¸¹" à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸—à¸µà¹ˆà¸£à¸­à¸‡à¸£à¸±à¸š`)
                        }
                    } catch (aiErr) {
                        console.error('LINE AI error:', aiErr)
                        await replyToUser(replyToken, `ðŸ¤– à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™ AI à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¸„à¸£à¸±à¸š`)
                    }
                    continue
                }

                // Unbound user & unknown command
                if (!boundCustomer && !boundDriver && !boundAdmin) {
                    await replyToUser(replyToken, `ðŸ‘‹ à¸ªà¸§à¸±à¸ªà¸”à¸µà¸„à¸£à¸±à¸š! à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸œà¸¹à¸à¸šà¸±à¸à¸Šà¸µ\nà¸žà¸´à¸¡à¸žà¹Œ BIND [à¸£à¸«à¸±à¸ª] [à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£] à¸«à¸£à¸·à¸­à¸žà¸´à¸¡à¸žà¹Œ "à¹€à¸¡à¸™à¸¹" à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸§à¸´à¸˜à¸µà¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸„à¸£à¸±à¸š`)
                }
            }
        }

        return NextResponse.json({ status: 'ok' })
    } catch (err) {
        console.error('Webhook error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
