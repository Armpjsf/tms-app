import { getEmissionFactorsList } from "@/lib/actions/esg-settings-actions"
import { getFreightFactorsList } from "@/lib/actions/carbon-factors"
import { ESGSettingsClient } from "./esg-settings-client"
import { FreightFactorsCard } from "./freight-factors-card"

export const metadata = {
    title: "ตั้งค่าพารามิเตอร์สิ่งแวดล้อม (ESG Settings) | TMS 2026",
    description: "ตั้งค่าและจัดการค่า Emission Factors ตามมาตรฐาน อบก."
}

export default async function ESGSettingsPage() {
    const [list, freight] = await Promise.all([
        getEmissionFactorsList(),
        getFreightFactorsList(),
    ])

    return (
        <div className="space-y-6">
            <ESGSettingsClient initialList={list} />
            <div className="max-w-6xl mx-auto w-full px-4">
                <FreightFactorsCard initialList={freight} />
            </div>
        </div>
    )
}
