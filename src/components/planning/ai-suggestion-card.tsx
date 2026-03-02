"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getSuggestedDrivers, DriverSuggestion } from "@/lib/ai/ai-assign"
import {
  Sparkles,
  MapPin,
  Truck,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  Navigation,
  Zap,
  AlertCircle
} from "lucide-react"

interface AiSuggestionCardProps {
  jobData: {
    Pickup_Lat?: number | null
    Pickup_Lon?: number | null
    Vehicle_Type?: string | null
    Plan_Date?: string | null
  }
  onSelect: (driver: DriverSuggestion) => void
}

export function AiSuggestionCard({ jobData, onSelect }: AiSuggestionCardProps) {
  const [suggestions, setSuggestions] = useState<DriverSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    try {
      const results = await getSuggestedDrivers(jobData, 5)
      setSuggestions(results)
    } catch (e) {
      console.error("AI suggestion error:", e)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400"
    if (score >= 60) return "text-amber-400"
    return "text-red-400"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30"
    if (score >= 60) return "from-amber-500/20 to-amber-600/5 border-amber-500/30"
    return "from-red-500/20 to-red-600/5 border-red-500/30"
  }

  const getScoreRing = (score: number) => {
    if (score >= 80) return "ring-emerald-500/30"
    if (score >= 60) return "ring-amber-500/30"
    return "ring-red-500/30"
  }

  return (
    <div className="space-y-3">
      {/* Trigger Button */}
      {!hasSearched && (
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/40"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          🤖 AI แนะนำคนขับที่เหมาะสมที่สุด
        </Button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            <span className="text-violet-300 font-medium">กำลังวิเคราะห์คนขับ...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasSearched && !loading && suggestions.length === 0 && (
        <div className="p-6 text-center rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-bold">ไม่พบคนขับที่พร้อม</p>
          <p className="text-gray-400 text-sm mt-1">ลองเปลี่ยนวันที่หรือกดค้นหาใหม่</p>
          <Button variant="outline" size="sm" onClick={handleSearch} className="mt-3 border-slate-600">
            ค้นหาอีกครั้ง
          </Button>
        </div>
      )}

      {/* Results */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-violet-300 uppercase tracking-wider">
                AI Recommendations
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSearch} className="text-gray-400 hover:text-white text-xs">
              รีเฟรช
            </Button>
          </div>

          {suggestions.map((driver, index) => (
            <div
              key={driver.Driver_ID}
              className={`bg-gradient-to-r ${getScoreBg(driver.match_score)} border rounded-xl backdrop-blur-sm cursor-pointer hover:scale-[1.01] transition-all duration-200 group`}
              onClick={() => onSelect(driver)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Driver Info */}
                  <div className="flex items-center gap-3 flex-1">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30' :
                      index === 1 ? 'bg-slate-400/20 text-slate-300' :
                      'bg-orange-700/20 text-orange-400'
                    }`}>
                      {index === 0 ? <Star className="w-5 h-5" /> : `#${index + 1}`}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm truncate">{driver.Driver_Name}</p>
                        {index === 0 && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wide">
                            Best Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {driver.Vehicle_Plate}
                        </span>
                        {driver.distance_km !== null && (
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> {driver.distance_km} km
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> งานวันนี้: {driver.active_jobs_today}
                        </span>
                      </div>

                      {/* Score Breakdown */}
                      <div className="flex items-center gap-2 mt-2">
                        <ScorePill label="ระยะทาง" score={driver.distance_score} icon={<MapPin className="w-2.5 h-2.5" />} />
                        <ScorePill label="ว่าง" score={driver.availability_score} icon={<CheckCircle2 className="w-2.5 h-2.5" />} />
                        <ScorePill label="รถ" score={driver.vehicle_match_score} icon={<Truck className="w-2.5 h-2.5" />} />
                        <ScorePill label="ผลงาน" score={driver.performance_score} icon={<Zap className="w-2.5 h-2.5" />} />
                      </div>
                    </div>
                  </div>

                  {/* Right: Match Score */}
                  <div className={`text-center ml-3 ring-2 ${getScoreRing(driver.match_score)} rounded-2xl p-3 bg-black/20`}>
                    <p className={`text-2xl font-black ${getScoreColor(driver.match_score)}`}>
                      {driver.match_score}
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">MATCH</p>
                  </div>
                </div>

                {/* Select Button (visible on hover) */}
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(driver)
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> เลือกคนขับนี้
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Mini score pill component
function ScorePill({ score, icon }: { label: string, score: number, icon: React.ReactNode }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
                score >= 50 ? 'text-amber-400 bg-amber-500/10' :
                'text-red-400 bg-red-500/10'
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${color}`}>
      {icon} {score}
    </span>
  )
}
