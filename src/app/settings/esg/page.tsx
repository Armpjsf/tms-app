import { getEmissionFactorsList } from "@/lib/actions/esg-settings-actions"
import { getFreightFactorsList, getEmptyReturnRatio, getTreeAbsorbKgPerYear } from "@/lib/actions/carbon-factors"
import { ESGSettingsClient } from "./esg-settings-client"
import { FreightFactorsCard } from "./freight-factors-card"
import { EmptyReturnCard } from "./empty-return-card"
import Link from "next/link"
import { FileText } from "lucide-react"

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

                {/* Evidence Report — เอกสารอ้างอิงสำหรับยื่น อบก. */}
                <Link
                    href="/settings/esg/evidence"
                    target="_blank"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 hover:bg-primary/10 transition"
                >
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="font-black text-base">เอกสารอ้างอิงค่าสัมประสิทธิ์ (Evidence Report)</h3>
                            <p className="text-xs text-muted-foreground">พิมพ์ตาราง EF + แหล่งอ้างอิง + วันบังคับใช้ สำหรับยื่น อบก./ISO 14083</p>
                        </div>
                    </div>
                    <span className="text-primary font-bold text-sm">เปิด →</span>
                </Link>
            </div>
        </div>
    )
}
