"use client"

import { useState, useEffect, useRef } from "react"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, AlertTriangle, ShieldAlert, Ambulance, ExternalLink, Loader2, CheckCircle2 } from "lucide-react"
import { getCompanyProfile, CompanyProfile } from "@/lib/supabase/settings"
import { notifyAdminSOS, notifySilentSOS } from "@/lib/actions/push-actions"
import { toast } from "sonner"

type Props = {
  driverId: string
  driverName: string
  driverPhone: string
}

export function SOSPageClient({ driverId, driverName, driverPhone }: Props) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<string>("กำลังค้นหาพิกัด...")
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sosSent, setSosSent] = useState(false)
  const sosNotifyRef = useRef(false)

  useEffect(() => {
    getCompanyProfile().then(setProfile).catch(() => {})

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ lat: latitude, lng: longitude })
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          setLoading(false)
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            const data = await res.json()
            if (data.display_name) setAddress(data.display_name)
          } catch {}
        },
        () => {
          setAddress("ไม่สามารถระบุพิกัดได้")
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setTimeout(() => {
        setAddress("อุปกรณ์ไม่รองรับ GPS")
        setLoading(false)
      }, 0)
    }
  }, [])

  const handleSOSCall = () => {
    const number = profile?.phone || "021234567"
    
    // Fire notification to admins in background
    if (driverId && !sosNotifyRef.current) {
      sosNotifyRef.current = true
      setSosSent(true)
      notifyAdminSOS(driverId, driverName, number).catch(e => console.error("SOS Background error:", e))
    }
    
    // Trigger dialer immediately
    window.location.href = `tel:${number}`
  }

  const handleSilentSOS = async () => {
    if (!driverId || isSending) return
    
    setIsSending(true)
    try {
        await notifySilentSOS(
            driverId, 
            driverName, 
            driverPhone, 
            location?.lat, 
            location?.lng, 
            address
        )
        setSosSent(true)
    } catch (e) {
        console.error("Silent SOS error:", e)
        toast.error("ไม่สามารถส่งแจ้งเตือนได้")
    } finally {
        setIsSending(false)
    }
  }

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`
  }

  const openMap = () => {
    if (!location) return
    const q = `${location.lat},${location.lng}`
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isAndroid) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else if (isIOS) {
      window.location.href = `comgooglemaps://?daddr=${q}`
      setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.href = `https://maps.apple.com/?daddr=${q}`
      }, 500)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งเหตุฉุกเฉิน" showBack />

      <div className="space-y-6 text-center">

        <div className="py-6 animate-pulse">
          <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">ฉุกเฉิน / อุบัติเหตุ</h1>
          <p className="text-muted-foreground">กดปุ่มด้านล่างเพื่อขอความช่วยเหลือทันที</p>
        </div>

        <div className="grid gap-4">
          {/* Silent SOS Button */}
          <Button
            onClick={handleSilentSOS}
            disabled={isSending}
            style={{ backgroundColor: isSending ? '#991b1b' : '#e11d48' }}
            className="h-32 text-2xl font-black text-white shadow-xl flex flex-col items-center justify-center gap-1 border-b-8 border-rose-900 active:border-b-0 active:translate-y-2 transition-all rounded-3xl mb-2"
          >
            <div className="flex items-center gap-3">
                {isSending ? <Loader2 className="animate-spin" size={36} /> : <AlertTriangle size={36} className="animate-pulse" />}
                <span>{isSending ? "กำลังส่ง..." : "แจ้งฉุกเฉิน (ไม่โทร)"}</span>
            </div>
            <span className="text-sm font-bold opacity-80 uppercase tracking-widest">กดเพื่อส่งพิกัดให้แอดมินทันที</span>
          </Button>

          {/* SOS sent banner */}
          {sosSent && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center justify-center gap-3 mb-1">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <p className="text-emerald-600 font-black text-lg">ส่งการแจ้งเตือนสำเร็จ</p>
              </div>
              <p className="text-emerald-600/80 font-bold text-xs uppercase tracking-widest">🆘 เจ้าหน้าที่ได้รับพิกัดของคุณแล้ว กำลังตรวจสอบ...</p>
            </div>
          )}

          {/* Main SOS Button */}
          <Button
            onClick={handleSOSCall}
            className="h-20 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-center gap-1"
          >
            <div className="flex items-center gap-2">
              <Phone size={24} />
              <span>ติดต่อแอดมิน / หัวหน้างาน</span>
            </div>
            <span className="text-lg font-bold font-normal opacity-80">
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
            <span className="text-lg font-bold font-normal opacity-80">191</span>
          </Button>

          <Button
            onClick={() => handleCall("1669")}
            className="h-20 text-lg font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center gap-1"
          >
            <div className="flex items-center gap-2">
              <Ambulance size={24} />
              <span>เรียกรถพยาบาล</span>
            </div>
            <span className="text-lg font-bold font-normal opacity-80">1669</span>
          </Button>

          <Button
            onClick={() => handleCall("1554")}
            variant="outline"
            className="h-16 text-gray-700 border-gray-200 hover:bg-gray-100"
          >
            หน่วยกู้ภัย (1554)
          </Button>
        </div>

        <Card className="bg-white border-gray-200 mt-8 text-left">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-gray-800 font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500" : "bg-emerald-500"} animate-pulse`} />
                พิกัดปัจจุบันของคุณ
              </h3>
              {location && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-emerald-600 px-3 hover:text-emerald-500 bg-emerald-50 rounded-xl flex items-center gap-1"
                  onClick={openMap}
                >
                  <ExternalLink size={16} />
                  <span className="font-bold">เปิดแผนที่</span>
                </Button>
              )}
            </div>

            <p className="text-muted-foreground text-xl break-words">
              {loading ? "กำลังระบุตำแหน่ง..." : address}
            </p>

            {location && (
              <p className="text-lg font-bold text-gray-400 mt-1 font-mono">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}

            <p className="text-base font-bold text-muted-foreground mt-2">
              *พิกัดจะถูกส่งให้แอดมินอัตโนมัติเมื่อกดโทรออก
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
