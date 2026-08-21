import { getEmissionFactorsList } from "@/lib/actions/esg-settings-actions"
import { getFreightFactorsList, getEmptyReturnRatio, getTreeAbsorbKgPerYear } from "@/lib/actions/carbon-factors"
import { ESGSettingsClient } from "./esg-settings-client"
import { FreightFactorsCard } from "./freight-factors-card"
import { EmptyReturnCard } from "./empty-return-card"

export const metadata = {
    title: "ตั้งค่าพารามิเตอร์สิ่งแวดล้อม (ESG Settings) | TMS 2026",
    description: "ตั้งค่าและจัดการค่า Emission Factors ตามมาตรฐาน อบก."
}

export default async function ESGSettingsPage() {
    const [list, freight, emptyReturnRatio, treeKg] = await Promise.all([
        getEmissionFactorsList(),
        getFreightFactorsList(),
        getEmptyReturnRatio(),
        getTreeAbsorbKgPerYear(),
    ])

    return (
        <div className="space-y-6">
            <ESGSettingsClient initialList={list} />
            <div className="max-w-6xl mx-auto w-full px-4 space-y-6">
                <FreightFactorsCard initialList={freight} />
                <EmptyReturnCard initialRatio={emptyReturnRatio} initialTreeKg={treeKg} />
            </div>
        </div>
    )
}
