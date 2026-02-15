"use client"

import { useState, useEffect } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, AlertTriangle, ShieldAlert, Ambulance, MapPin, ExternalLink } from "lucide-react"
import { getCompanyProfile, CompanyProfile } from "@/lib/supabase/settings"

export default function MobileSOSPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<string>("กำลังค้นหาพิกัด...")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch Company Profile for Phone Number
    const fetchProfile = async () => {
        try {
            const data = await getCompanyProfile()
            setProfile(data)
        } catch (error) {
            console.error(error)
        }
    }
    fetchProfile()

    // 2. Get Geolocation
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                setLocation({ lat: latitude, lng: longitude })
                setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                setLoading(false)
                
                // Optional: Reverse Geocoding API could go here
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    const data = await res.json()
                    if (data.display_name) {
                        setAddress(data.display_name)
                    }
                } catch {}
            },
            (error) => {
                console.error("GPS Error:", error)
                setAddress("ไม่สามารถระบุพิกัดได้")
                setLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    } else {
        setAddress("อุปกรณ์ไม่รองรับ GPS")
        setLoading(false)
    }
  }, [])

  const handleCall = (number?: string) => {
    if (number) window.location.href = `tel:${number}`
  }

  const openMap = () => {
    if (location) {
        window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="ขอความช่วยเหลือ (SOS)" showBack />

      <div className="space-y-6 text-center">
        
        <div className="py-6 animate-pulse">
            <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                <ShieldAlert size={48} className="text-red-500" />
            </div>
        </div>

        <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">ฉุกเฉิน / อุบัติเหตุ</h1>
            <p className="text-slate-400">
                กดปุ่มด้านล่างเพื่อโทรออกทันที
            </p>
        </div>

        <div className="grid gap-4">
            <Button 
                onClick={() => handleCall(profile?.phone || "021234567")} 
                className="h-20 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-center gap-1"
            >
                <div className="flex items-center gap-2">
                    <Phone size={24} />
                    <span>ติดต่อแอดมิน / หัวหน้างาน</span>
                </div>
                <span className="text-xs font-normal opacity-80">
                    {profile?.phone || "02-123-4567"}
                </span>
            </Button>

            <Button 
                onClick={() => handleCall("191")}
                className="h-20 text-lg font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 flex flex-col items-center justify-center gap-1"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle size={24} />
                    <span>แจ้งเหตุด่วน (ตำรวจ)</span>
                </div>
                <span className="text-xs font-normal opacity-80">191</span>
            </Button>

            <Button 
                onClick={() => handleCall("1669")}
                className="h-20 text-lg font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center gap-1"
            >
                <div className="flex items-center gap-2">
                    <Ambulance size={24} />
                    <span>เรียกรถพยาบาล</span>
                </div>
                <span className="text-xs font-normal opacity-80">1669</span>
            </Button>
            
             <Button 
                onClick={() => handleCall("1554")}
                variant="outline"
                className="h-16 text-slate-300 border-slate-700 hover:bg-slate-800"
            >
                หน่วยกู้ภัย (1554)
            </Button>
        </div>

        <Card className="bg-slate-900 border-slate-800 mt-8 text-left">
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-200 font-medium flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500" : "bg-emerald-500"} animate-pulse`} />
                        พิกัดปัจจุบันของคุณ
                    </h3>
                    {location && (
                        <Button variant="ghost" size="sm" onClick={openMap} className="h-6 text-indigo-400 p-0 hover:text-indigo-300">
                            <ExternalLink size={14} className="mr-1" /> เปิดแผนที่
                        </Button>
                    )}
                </div>
                
                <p className="text-slate-400 text-sm break-words">
                    {loading ? "กำลังระบุตำแหน่ง..." : address}
                </p>
                
                {location && (
                     <p className="text-xs text-slate-500 mt-1 font-mono">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                )}

                <p className="text-[10px] text-slate-600 mt-2">
                    *พิกัดจะถูกส่งให้แอดมินอัตโนมัติเมื่อกดโทรออก
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
