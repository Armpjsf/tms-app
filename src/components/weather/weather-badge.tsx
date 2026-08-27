"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudRain, AlertTriangle, Loader2 } from "lucide-react"
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
    // compact = ชิปเล็กบรรทัดเดียว สำหรับการ์ด/ลิสต์
    compact?: boolean
}

type Forecast = {
    code: number
    tMax: number
    tMin: number
    rainProb: number
    rainSum: number // มิลลิเมตร (mm)
}

type WeatherInfo = {
    emoji: string
    label: string
    level: 'clear' | 'cloudy' | 'drizzle' | 'rain' | 'heavy'
    warningText?: string
}

function describeWeather(code: number, rainSum: number, rainProb: number): WeatherInfo {
    // 1. พายุฝนฟ้าคะนอง หรือฝนตกหนักจริง (>= 12 mm หรือ WMO Code 95+)
    if (code >= 95 || rainSum >= 12 || (code >= 65 && rainSum >= 8)) {
        return {
            emoji: "⛈️",
            label: "พายุฝนฟ้าคะนอง",
            level: "heavy",
            warningText: "ระวังพายุ/คลุมผ้าใบ"
        }
    }

    // 2. ฝนตกปานกลาง (4 - 12 mm) — ต้องเตรียมผ้าใบกันสินค้าเปียก
    if (code >= 80 || code >= 61 || rainSum >= 4) {
        return {
            emoji: "🌧️",
            label: "ฝนตกปานกลาง",
            level: "rain",
            warningText: "เตรียมผ้าใบคลุม"
        }
    }

    // 3. ฝนปรอยๆ / ละอองสั้นๆ (0.4 - 4 mm) — ไม่หนัก ไม่ต้องแจ้งเตือนฉุกเฉิน
    if (code >= 51 || (rainSum >= 0.4 && rainSum < 4) || (rainProb >= 70 && rainSum > 0.2)) {
        return {
            emoji: "🌦️",
            label: "ฝนละอองบางพื้นที่",
            level: "drizzle",
            warningText: undefined
        }
    }

    // 4. เมฆมาก
    if (code === 3) {
        return { emoji: "☁️", label: "มีเมฆมาก", level: "cloudy" }
    }

    // 5. มีเมฆบางส่วน
    if (code >= 1 && code <= 2) {
        return { emoji: "🌤️", label: "มีเมฆบางส่วน", level: "clear" }
    }

    // 6. ท้องฟ้าโปร่ง / แดดจัด
    return { emoji: "☀️", label: "ท้องฟ้าโปร่ง", level: "clear" }
}

function toDateOnly(d?: string | null): string | null {
    if (!d) return null
    const s = String(d).trim()
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
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
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
                    rainSum: +(d.precipitation_sum?.[0] ?? 0).toFixed(1)
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
        if (compact) return null
        return (
            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
                <Loader2 size={12} className="animate-spin" />
                <span>กำลังโหลดพยากรณ์อากาศ…</span>
            </div>
        )
    }

    if (!forecast) return null

    const info = describeWeather(forecast.code, forecast.rainSum, forecast.rainProb)

    const tooltip = `สภาพอากาศปลายทาง: ${info.label} · อุณหภูมิ ${forecast.tMin}–${forecast.tMax}°C · ปริมาณฝน ${forecast.rainSum} mm (โอกาสฝน ${forecast.rainProb}%)`

    // Compact chip — for job cards & tracking list rows
    if (compact) {
        return (
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors",
                    info.level === 'heavy' && "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-sm",
                    info.level === 'rain' && "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
                    info.level === 'drizzle' && "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
                    info.level === 'cloudy' && "bg-muted/50 border-border/40 text-muted-foreground",
                    info.level === 'clear' && "bg-amber-500/5 border-amber-500/20 text-foreground",
                    className
                )}
                title={tooltip}
            >
                <span className="text-sm leading-none" aria-hidden>{info.emoji}</span>
                <span>{forecast.tMin}–{forecast.tMax}°C</span>
                {forecast.rainSum > 0 ? (
                    <span className="opacity-90">· ฝน {forecast.rainSum}mm</span>
                ) : (
                    <span className="opacity-75">· {info.label}</span>
                )}
                {info.warningText && (
                    <span className="font-black uppercase tracking-wider text-[10px] pl-0.5">· {info.warningText}</span>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                info.level === 'heavy' && "bg-rose-500/10 border-rose-500/30 text-rose-500",
                info.level === 'rain' && "bg-blue-500/10 border-blue-500/30",
                info.level === 'drizzle' && "bg-sky-500/5 border-sky-500/20",
                (info.level === 'cloudy' || info.level === 'clear') && "bg-muted/30 border-border/40",
                className
            )}
            title={tooltip}
        >
            <span className="text-2xl leading-none" aria-hidden>
                {info.emoji}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    สภาพอากาศปลายทางวันส่ง
                </p>
                <p className="text-sm font-bold text-foreground truncate">
                    {info.label} · {forecast.tMin}–{forecast.tMax}°C {forecast.rainSum > 0 ? `· ปริมาณฝน ${forecast.rainSum} mm` : ''}
                </p>
            </div>
            {info.warningText && (
                <span className={cn(
                    "shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                    info.level === 'heavy' ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                )}>
                    {info.level === 'heavy' ? <AlertTriangle size={12} /> : <Cloud size={12} />}
                    {info.warningText}
                </span>
            )}
        </div>
    )
}

