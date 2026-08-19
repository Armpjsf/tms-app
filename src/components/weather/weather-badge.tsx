"use client"

import { useEffect, useState } from "react"
import { Cloud, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * WeatherBadge — พยากรณ์อากาศปลายทางในวันจัดส่ง (Open-Meteo, ฟรี ไม่ต้อง API key)
 *
 * ดึงตรงจาก browser (Open-Meteo อนุญาต CORS) จึงไม่มี server load / ไม่แตะ DB
 * โชว์เฉพาะเมื่อมีพิกัด + วันที่อยู่ในช่วงพยากรณ์ได้ (ย้อนหลัง ~2 วัน ถึงล่วงหน้า ~16 วัน)
 */

type Props = {
    lat?: number | null
    lon?: number | null
    date?: string | null // YYYY-MM-DD หรือ ISO
    className?: string
    // compact = ชิปเล็กบรรทัดเดียว (อีโมจิ + อุณหภูมิ + โอกาสฝน) สำหรับการ์ด/ลิสต์
    compact?: boolean
}

type Forecast = {
    code: number
    tMax: number
    tMin: number
    rainProb: number
}

// WMO Weather interpretation codes → emoji + คำอธิบายไทย
function describe(code: number): { emoji: string; label: string } {
    if (code === 0) return { emoji: "☀️", label: "ท้องฟ้าโปร่ง" }
    if (code <= 2) return { emoji: "🌤️", label: "มีเมฆบางส่วน" }
    if (code === 3) return { emoji: "☁️", label: "เมฆมาก" }
    if (code <= 48) return { emoji: "🌫️", label: "หมอก" }
    if (code <= 57) return { emoji: "🌦️", label: "ฝนปรอย" }
    if (code <= 67) return { emoji: "🌧️", label: "ฝนตก" }
    if (code <= 77) return { emoji: "🌨️", label: "หิมะ" }
    if (code <= 82) return { emoji: "🌧️", label: "ฝนตกหนัก" }
    if (code <= 86) return { emoji: "🌨️", label: "หิมะตกหนัก" }
    if (code <= 99) return { emoji: "⛈️", label: "พายุฝนฟ้าคะนอง" }
    return { emoji: "🌡️", label: "ไม่ทราบสภาพอากาศ" }
}

function toDateOnly(d?: string | null): string | null {
    if (!d) return null
    const s = String(d).trim()
    // ตัดเวลาออก เหลือ YYYY-MM-DD
    const m = s.match(/^\d{4}-\d{2}-\d{2}/)
    if (m) return m[0]
    const parsed = new Date(s)
    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString("en-CA")
    return null
}

export function WeatherBadge({ lat, lon, date, className, compact }: Props) {
    const [forecast, setForecast] = useState<Forecast | null>(null)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)

    const day = toDateOnly(date)

    useEffect(() => {
        if (lat == null || lon == null || !day) return

        // จำกัดช่วง: Open-Meteo forecast ครอบคลุมย้อนหลัง ~2 วัน ถึงล่วงหน้า ~16 วัน
        const target = new Date(day + "T00:00:00")
        const now = new Date()
        const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000)
        if (isNaN(diffDays) || diffDays < -2 || diffDays > 16) return

        let cancelled = false
        setLoading(true)
        setFailed(false)

        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&timezone=Asia%2FBangkok&start_date=${day}&end_date=${day}`

        fetch(url)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("weather fetch failed"))))
            .then((json) => {
                if (cancelled) return
                const d = json?.daily
                if (!d || !Array.isArray(d.weather_code) || d.weather_code.length === 0) {
                    setFailed(true)
                    return
                }
                setForecast({
                    code: d.weather_code[0],
                    tMax: Math.round(d.temperature_2m_max?.[0] ?? 0),
                    tMin: Math.round(d.temperature_2m_min?.[0] ?? 0),
                    rainProb: d.precipitation_probability_max?.[0] ?? 0,
                })
            })
            .catch(() => !cancelled && setFailed(true))
            .finally(() => !cancelled && setLoading(false))

        return () => {
            cancelled = true
        }
    }, [lat, lon, day])

    if (lat == null || lon == null || !day) return null
    if (failed) return null

    if (loading) {
        if (compact) return null // keep cards/lists quiet while loading
        return (
            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
                <Loader2 size={12} className="animate-spin" />
                <span>กำลังโหลดพยากรณ์อากาศ…</span>
            </div>
        )
    }

    if (!forecast) return null

    const { emoji, label } = describe(forecast.code)
    const heavyRain = forecast.rainProb >= 60 || (forecast.code >= 61 && forecast.code <= 99)

    // Compact chip — one line, fits inside a job card / tracking list row.
    if (compact) {
        return (
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold",
                    heavyRain ? "bg-blue-500/10 border-blue-500/30 text-blue-600" : "bg-sky-500/5 border-sky-500/20 text-foreground",
                    className
                )}
                title={`อากาศปลายทางวันส่ง: ${label} · ${forecast.tMin}–${forecast.tMax}°C · โอกาสฝน ${forecast.rainProb}%`}
            >
                <span className="text-sm leading-none" aria-hidden>{emoji}</span>
                <span>{forecast.tMin}–{forecast.tMax}°C</span>
                <span className={cn("opacity-70", heavyRain && "opacity-100")}>· ฝน {forecast.rainProb}%</span>
                {heavyRain && <span className="uppercase tracking-wider">· เตรียมกันฝน</span>}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border",
                heavyRain
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-sky-500/5 border-sky-500/20",
                className
            )}
        >
            <span className="text-2xl leading-none" aria-hidden>
                {emoji}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    อากาศปลายทางวันส่ง
                </p>
                <p className="text-sm font-bold text-foreground truncate">
                    {label} · {forecast.tMin}–{forecast.tMax}°C · โอกาสฝน {forecast.rainProb}%
                </p>
            </div>
            {heavyRain && (
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-wider">
                    <Cloud size={12} /> เตรียมกันฝน
                </span>
            )}
        </div>
    )
}
