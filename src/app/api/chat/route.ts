import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFinancialStats } from '@/lib/supabase/financial-analytics'
import { getVehicleProfitability, getOperationalStats, getDriverLeaderboard } from '@/lib/supabase/fleet-analytics'
import { getMaintenanceSchedule } from '@/lib/supabase/maintenance-schedule'
import { getSafetyAnalytics } from '@/lib/supabase/safety-analytics'
import { getESGStats } from '@/lib/supabase/esg-analytics'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { message } = await req.json()
        const text = message.trim().toLowerCase()
        
        // Respect selectedBranch cookie if present (important for Super Admins)
        const cookieStore = await cookies()
        const selectedBranch = cookieStore.get('selectedBranch')?.value
        const branchId = selectedBranch === 'All' ? undefined : (selectedBranch || session.branchId || undefined)

        let response = ""

        // 1. Revenue Queries
        if (text.includes('ยอดขาย') || text.includes('รายได้') || text.includes('revenue')) {
            const stats = await getFinancialStats(undefined, undefined, branchId)
            response = `💰 รายได้รวมเดือนนี้อยู่ที่ประมาณ ฿${stats.revenue.toLocaleString()} ครับ`
        }
        
        // 2. Maintenance Queries
        else if (text.includes('ซ่อม') || text.includes('เช็คระยะ') || text.includes('maintenance')) {
            const m = await getMaintenanceSchedule()
            response = `🛠️ สถานะการซ่อมบำรุงปัจจุบัน:\n`
            response += `- รถที่กำลังซ่อม: ${m.activeRepairs} คัน\n`
            response += `- รถที่เกินกำหนดเช็คระยะ: ${m.overdue.length} คัน\n`
            response += `- รถที่ต้องเข้าเช็คเร็วๆ นี้: ${m.dueSoon.length} คัน\n`
            if (m.overdue.length > 0) {
                response += `📍 คันที่เร่งด่วน: ${m.overdue.slice(0, 2).map(v => v.vehicle_plate).join(', ')}`
            }
        }

        // 3. Safety / SOS Queries
        else if (text.includes('sos') || text.includes('อุบัติเหตุ') || text.includes('ปัญหา') || text.includes('incident')) {
            const s = await getSafetyAnalytics()
            response = `🚨 รายงานความปลอดภัยวันนี้:\n`
            response += `- การแจ้งเตือน SOS: ${s.sos.total} รายการ (Active: ${s.sos.active})\n`
            response += `- อัตราการปฏิบัติตามกฎ (POD Compliance): ${s.pod.complianceRate.toFixed(1)}%\n`
            if (s.sos.active > 0) {
                response += `‼️ มีเคส SOS ที่รอดำเนินการอยู่ ${s.sos.active} เคสครับ!`
            } else {
                response += `✅ ยังไม่พบเหตุการณ์รุนแรงในวันนี้ครับ`
            }
        }

        // 4. Operations / Job Status
        else if (text.includes('งาน') || text.includes('เมื่อกี้') || text.includes('jobs') || text.includes('สถานะ')) {
            const op = await getOperationalStats(branchId)
            response = `🚛 สรุปการดำเนินงานวันนี้:\n`
            response += `- จำนวนรถที่ใช้งาน: ${op.fleet.active} คัน\n`
            response += `- อัตราการส่งมอบตรงเวลา: ${op.fleet.onTimeDelivery.toFixed(1)}%\n`
            response += `- การใช้รถ (Utilization): ${op.fleet.utilization.toFixed(1)}%`
        }

        // 5. Environmental / ESG
        else if (text.includes('co2') || text.includes('สิ่งแวดล้อม') || text.includes('ลด') || text.includes('esg')) {
            const esg = await getESGStats(undefined, undefined, branchId)
            response = `🍃 ข้อมูลด้านสิ่งแวดล้อม (ESG):\n`
            response += `- ลดการปล่อย CO2 ได้แล้ว: ${esg.co2SavedKg.toLocaleString()} kg\n`
            response += `- เทียบเท่าการปลูกต้นไม้: ${esg.treesSaved.toLocaleString()} ต้น\n`
            response += `- ระยะทางที่ประหยัดได้: ${esg.totalSavedKm.toLocaleString()} km`
        }

        // 6. Best Vehicles (Check this before Profit because it might contain the word 'กำไร')
        else if (text.includes('รถ') && (text.includes('ดี') || text.includes('กำไร') || text.includes('top'))) {
            const vehicles = await getVehicleProfitability(undefined, undefined, branchId)
            const top = vehicles.slice(0, 3)
            if (top.length === 0) {
                response = `🚛 ขออภัยครับ ยังไม่พบข้อมูลการทำกำไรของรถในระบบครับ`
            } else {
                response = `🚛 รถที่ทำกำไรสูงสุด 3 อันดับแรกคือ:\n`
                top.forEach((v, i) => {
                    response += `${i+1}. ${v.plate} (กำไร: ฿${v.netProfit.toLocaleString()})\n`
                })
            }
        }

        // 7. Driver Performance
        else if (text.includes('คนขับ') || text.includes('พนักงาน') || text.includes('driver')) {
            const leaderboard = await getDriverLeaderboard(undefined, undefined, branchId)
            response = `🏆 คนขับที่มีประสิทธิภาพสูงสุด:\n`
            leaderboard.slice(0, 3).forEach((d, i) => {
                response += `${i+1}. ${d.name} (รายได้สะสม: ฿${d.revenue.toLocaleString()})\n`
            })
        }

        // 8. Profit Queries
        else if (text.includes('กำไร') || text.includes('profit')) {
            const stats = await getFinancialStats(undefined, undefined, branchId)
            response = `📈 กำไรสุทธิปัจจุบันอยู่ที่ ฿${stats.netProfit.toLocaleString()} (Margin: ${(stats.profitMargin ?? 0).toFixed(1)}%) ครับ`
        }

        // 9. Help / Default
        else {
            response = `🤖 สวัสดีครับคุณ ${session.username} ผมเป็นผู้ช่วยอัจฉริยะ คุณสามารถถามผมเกี่ยวกับ:\n- 💰 รายได้/กำไรเดือนนี้\n- 🛠️ สถานะการซ่อมบำรุง/รถเสีย\n- 🚨 ความปลอดภัย/SOS\n- 🍃 การลด CO2 (ESG)\n- 🏆 ผลงานคนขับ\n- 🚛 ภาพรวมการดำเนินงานวันนี้`
        }

        return NextResponse.json({ response })
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
