import { getEmissionFactorsList } from "@/lib/actions/esg-settings-actions"
import { getFreightFactorsList, getEsgParametersList } from "@/lib/actions/carbon-factors"
import { PrintButton } from "@/components/billing/print-button"
import { AutoPrint } from "@/components/utils/auto-print"
import Link from "next/link"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "เอกสารอ้างอิงค่าสัมประสิทธิ์ ESG (Evidence Report) | TMS 2026",
}

// แผนที่ชื่อพารามิเตอร์ระบบ → คำอธิบายไทย
const PARAM_LABEL: Record<string, string> = {
    empty_return_ratio: "สัดส่วนปล่อยเที่ยวกลับรถเปล่า (Empty Return)",
    tree_absorb_kg_per_year: "อัตราดูดซับ CO₂ ของต้นไม้ (kgCO₂/ต้น/ปี)",
}

export default async function ESGEvidencePage({ searchParams }: { searchParams?: Promise<{ mode?: string }> }) {
    const sp = searchParams ? await searchParams : {}
    const autoPrint = sp?.mode === "print"

    const [fuels, freight, params] = await Promise.all([
        getEmissionFactorsList(),
        getFreightFactorsList(),
        getEsgParametersList(),
    ])

    const printedAt = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })

    return (
        <div className="bg-white min-h-screen p-6 text-black print:p-0">
            {autoPrint && <AutoPrint />}

            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
                <Link href="/settings/esg" className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold">
                    ← กลับหน้าตั้งค่า ESG
                </Link>
                <PrintButton />
            </div>

            <div id="printable-content" className="max-w-[210mm] mx-auto bg-white p-8 print:p-4">
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-3 mb-5">
                    <h1 className="text-2xl font-bold">เอกสารอ้างอิงค่าสัมประสิทธิ์การปล่อยคาร์บอน</h1>
                    <p className="text-sm text-slate-600">Emission Factor Evidence Report · มาตรฐาน ISO 14083 / GLEC / TGO (อบก.)</p>
                    <p className="text-xs text-slate-500 mt-1">พิมพ์เมื่อ: {printedAt}</p>
                </div>

                {/* 1. Fuel EF (Scope 1) */}
                <section className="mb-6">
                    <h2 className="text-base font-bold bg-slate-100 px-3 py-1.5 rounded">1. ค่าสัมประสิทธิ์เชื้อเพลิง (Fuel Emission Factors — Scope 1)</h2>
                    <table className="w-full text-xs border-collapse mt-2">
                        <thead>
                            <tr className="border-y border-slate-300 text-slate-600 text-left">
                                <th className="py-1.5 px-2">รหัสเชื้อเพลิง</th>
                                <th className="py-1.5 px-2 text-right">TTW (kgCO₂e/L)</th>
                                <th className="py-1.5 px-2 text-right">WTT (kgCO₂e/L)</th>
                                <th className="py-1.5 px-2 text-right">WTW รวม</th>
                                <th className="py-1.5 px-2">วันบังคับใช้</th>
                                <th className="py-1.5 px-2">แหล่งอ้างอิง (อบก.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fuels.filter(f => f.is_active).map(f => (
                                <tr key={f.id} className="border-b border-slate-100">
                                    <td className="py-1.5 px-2 font-mono font-bold">{f.fuel_code}</td>
                                    <td className="py-1.5 px-2 text-right">{f.ef_value}</td>
                                    <td className="py-1.5 px-2 text-right">{f.wtt_value ?? 0}</td>
                                    <td className="py-1.5 px-2 text-right font-bold">{(Number(f.ef_value) + Number(f.wtt_value ?? 0)).toFixed(4)}</td>
                                    <td className="py-1.5 px-2">{f.effective_date}</td>
                                    <td className="py-1.5 px-2 text-slate-600">{f.notes || "-"}</td>
                                </tr>
                            ))}
                            {fuels.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-slate-400">ไม่มีข้อมูล</td></tr>}
                        </tbody>
                    </table>
                </section>

                {/* 2. Freight EF (Scope 3) */}
                <section className="mb-6">
                    <h2 className="text-base font-bold bg-slate-100 px-3 py-1.5 rounded">2. ค่าสัมประสิทธิ์ขนส่งต่อชนิดรถ (Freight EF — Scope 3, GLEC Tonne-KM)</h2>
                    <table className="w-full text-xs border-collapse mt-2">
                        <thead>
                            <tr className="border-y border-slate-300 text-slate-600 text-left">
                                <th className="py-1.5 px-2">ประเภทรถ</th>
                                <th className="py-1.5 px-2 text-right">พิกัด (ตัน)</th>
                                <th className="py-1.5 px-2 text-right">EF (kgCO₂e/tkm)</th>
                                <th className="py-1.5 px-2 text-right">TTW (/km)</th>
                                <th className="py-1.5 px-2 text-right">WTT (/km)</th>
                                <th className="py-1.5 px-2 text-right">WTW (/km)</th>
                                <th className="py-1.5 px-2">วันบังคับใช้</th>
                                <th className="py-1.5 px-2">แหล่งอ้างอิง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {freight.filter(f => f.is_active).map(f => (
                                <tr key={f.id} className="border-b border-slate-100">
                                    <td className="py-1.5 px-2 font-mono font-bold">{f.vehicle_type}</td>
                                    <td className="py-1.5 px-2 text-right">{f.payload_tonnes ?? "-"}</td>
                                    <td className="py-1.5 px-2 text-right">{f.ef_tkm ?? "-"}</td>
                                    <td className="py-1.5 px-2 text-right">{f.co2_per_km}</td>
                                    <td className="py-1.5 px-2 text-right">{f.wtt_per_km ?? 0}</td>
                                    <td className="py-1.5 px-2 text-right font-bold">{(Number(f.co2_per_km) + Number(f.wtt_per_km ?? 0)).toFixed(4)}</td>
                                    <td className="py-1.5 px-2">{f.effective_date}</td>
                                    <td className="py-1.5 px-2 text-slate-600">{f.notes || "-"}</td>
                                </tr>
                            ))}
                            {freight.length === 0 && <tr><td colSpan={8} className="py-3 text-center text-slate-400">ไม่มีข้อมูล</td></tr>}
                        </tbody>
                    </table>
                </section>

                {/* 3. Global parameters */}
                <section className="mb-6">
                    <h2 className="text-base font-bold bg-slate-100 px-3 py-1.5 rounded">3. พารามิเตอร์ระบบ (Global Parameters)</h2>
                    <table className="w-full text-xs border-collapse mt-2">
                        <thead>
                            <tr className="border-y border-slate-300 text-slate-600 text-left">
                                <th className="py-1.5 px-2">พารามิเตอร์</th>
                                <th className="py-1.5 px-2 text-right">ค่า</th>
                                <th className="py-1.5 px-2">แหล่งอ้างอิง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {params.map(p => (
                                <tr key={p.param_key} className="border-b border-slate-100">
                                    <td className="py-1.5 px-2 font-bold">{PARAM_LABEL[p.param_key] || p.param_key}</td>
                                    <td className="py-1.5 px-2 text-right font-mono">{p.param_value}</td>
                                    <td className="py-1.5 px-2 text-slate-600">{p.notes || "-"}</td>
                                </tr>
                            ))}
                            {params.length === 0 && <tr><td colSpan={3} className="py-3 text-center text-slate-400">ยังไม่ได้รัน migration esg_parameters</td></tr>}
                        </tbody>
                    </table>
                </section>

                {/* Methodology note */}
                <section className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    <p className="font-bold text-slate-700 mb-1">หมายเหตุระเบียบวิธี (Methodology)</p>
                    <p>• WTW (Well-to-Wheel) = TTW (Tank-to-Wheel การเผาไหม้) + WTT (Well-to-Tank ต้นน้ำเชื้อเพลิง) ตาม ISO 14083</p>
                    <p>• การจัดสรร: Scope 1 ใช้ปริมาณน้ำมันจริง · Scope 3 ใช้ GLEC Tonne-KM ตามน้ำหนักสินค้า มิฉะนั้นประเมินจากพิกัดรถ</p>
                    <p>• เที่ยวกลับรถเปล่าคิดแยกขาแบบ per-km × empty-return ratio (ไม่ผูกน้ำหนักสินค้า เพื่อกัน double counting)</p>
                    <p>• &quot;เทียบเท่าปลูกต้นไม้&quot; = ปล่อย CO₂ ÷ อัตราดูดซับต้นไม้ (ดูตาราง 3)</p>
                </section>
            </div>

            <style type="text/css" media="print">{`
                @page { size: A4; margin: 8mm; }
                body { visibility: hidden; background: white !important; -webkit-print-color-adjust: exact !important; }
                #printable-content, #printable-content * { visibility: visible; }
                #printable-content { position: absolute; left: 0; top: 0; width: 100%; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; }
            `}</style>
        </div>
    )
}
