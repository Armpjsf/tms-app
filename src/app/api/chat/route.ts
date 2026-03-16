import { NextRequest, NextResponse } from 'next/server'
import { getFinancialStats, getRevenueTrend, getVehicleProfitability } from '@/lib/supabase/financial-analytics'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { message } = await req.json()
        const text = message.trim().toLowerCase()
        const branchId = session.branchId || undefined

        let response = ""

        // 1. Revenue Queries
        if (text.includes('ยอดขาย') || text.includes('รายได้') || text.includes('revenue')) {
            const stats = await getFinancialStats(undefined, undefined, branchId)
            response = `💰 รายได้รวมเดือนนี้อยู่ที่ประมาณ ฿${stats.revenue.toLocaleString()} ครับ`
            if (stats.revenueGrowth > 0) response += ` (เพิ่มขึ้นจากเดือนก่อน ${stats.revenueGrowth.toFixed(1)}%)`
        }
        
        // 2. Profit Queries
        else if (text.includes('กำไร') || text.includes('profit')) {
            const stats = await getFinancialStats(undefined, undefined, branchId)
            response = `📈 กำไรสุทธิปัจจุบันอยู่ที่ ฿${stats.netProfit.toLocaleString()} (Margin: ${stats.profitMargin.toFixed(1)}%) ครับ`
        }

        // 3. Best Vehicles
        else if (text.includes('รถ') && (text.includes('ดี') || text.includes('กำไร'))) {
            const vehicles = await getVehicleProfitability(undefined, undefined, branchId)
            const top = vehicles.slice(0, 3)
            response = `🚛 รถที่ทำกำไรสูงสุด 3 อันดับแรกคือ:\n`
            top.forEach((v, i) => {
                response += `${i+1}. ${v.plate} (กำไร: ฿${v.netProfit.toLocaleString()})\n`
            })
        }

        // 4. Help / Default
        else {
            response = `🤖 สวัสดีครับคุณ ${session.username} ผมเป็นผู้ช่วยอัจฉริยะ คุณสามารถถามผมเกี่ยวกับ:\n- ยอดขาย/รายได้เดือนนี้\n- กำไรปัจจุบัน\n- รถที่ทำกำไรดีที่สุด`
        }

        return NextResponse.json({ response })
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
