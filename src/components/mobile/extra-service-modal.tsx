"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Package, Layers, Truck, UserCheck, Plus, Minus, CheckCircle2, Phone, PenTool } from "lucide-react"
import { SignaturePad } from "@/components/mobile/signature-pad"

// 1 รายการ = 1 ชั้นที่แบกขึ้น พร้อมจำนวนกล่องของชั้นนั้น
export type FloorEntry = { floor: number; qty: number }

export type ExtraServiceData = {
  soNo: string
  storeName: string
  movedQty: number
  // ขึ้นชั้นหลายชั้นในจุดเดียว แยกจำนวนกล่องต่อชั้น (เช่น ชั้น 2 = 10, ชั้น 3 = 5)
  floors: FloorEntry[]
  // ── legacy (เก็บไว้เพื่อความเข้ากันได้กับข้อมูลเก่า/ออฟไลน์) ──
  // floorClimbQty = จำนวนชั้นที่ขึ้น, shelvedQty = จำนวนกล่องรวมทุกชั้น
  floorClimbQty: number
  shelvedQty: number
  approverPhone: string
  approverSignatureUrl?: string | null
  approverSignatureBlob?: Blob | null
  notes: string
  // จุดลงย่อยที่ลูกค้าแจ้งแบ่งหน้างาน (เช่น โกดัง) — สูงสุด 2 จุด
  // ระบบจะนำไปสร้างเป็นจุดส่งเพิ่มในงานนั้นตอนยืนยัน POD
  subDrops?: string[]
}

type ExtraServiceModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ExtraServiceData) => void
  currentJobId: string
  currentCustomerName?: string
  originalDestinations?: Array<{ name?: string; so_no?: string }>
  initialData?: ExtraServiceData | null
}

export function ExtraServiceModal({
  isOpen,
  onClose,
  onSave,
  currentJobId,
  currentCustomerName,
  originalDestinations,
  initialData
}: ExtraServiceModalProps) {
  // Extract all available SOs / Jobs for dropdown
  const [soOptions, setSoOptions] = useState<Array<{ so: string; store: string }>>([])
  
  const [selectedSo, setSelectedSo] = useState<string>(currentJobId)
  const [storeName, setStoreName] = useState<string>(currentCustomerName || "")
  // index ของตัวเลือกใน dropdown — ใช้เป็นค่าที่ไม่ซ้ำ (จุดหน้าร้าน/โกดังมี SO เดียวกันได้)
  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [movedQty, setMovedQty] = useState<number>(0)
  // ขึ้นชั้นหลายชั้น: แต่ละชั้นเก็บจำนวนกล่องแยกกัน
  const [floors, setFloors] = useState<FloorEntry[]>([])
  const [approverPhone, setApproverPhone] = useState<string>("")
  const [approverSigBlob, setApproverSigBlob] = useState<Blob | null>(null)
  const [approverSigUrl, setApproverSigUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>("")
  // จุดลงย่อย (เช่น โกดัง) — พิมพ์อิสระ สูงสุด 2 จุด
  const [subDrops, setSubDrops] = useState<string[]>([])

  useEffect(() => {
    // Build options from current job + originalDestinations
    const list: Array<{ so: string; store: string }> = []

    if (originalDestinations && Array.isArray(originalDestinations) && originalDestinations.length > 0) {
      originalDestinations.forEach((dest, idx) => {
        const soVal = dest.so_no ? String(dest.so_no).trim() : `${currentJobId}-${idx + 1}`
        const storeVal = dest.name ? String(dest.name).trim() : `จุดส่งที่ ${idx + 1}`
        list.push({
          so: soVal,
          store: storeVal
        })
      })
    } else {
      list.push({
        so: currentJobId,
        store: currentCustomerName || "งานปัจจุบัน"
      })
    }

    setSoOptions(list)

    if (initialData) {
      // หา index ที่ตรงทั้ง SO และชื่อร้าน (กันกรณี SO ซ้ำ เช่น หน้าร้าน vs โกดัง)
      const idx = list.findIndex(o => o.so === initialData.soNo && o.store === initialData.storeName)
      const safeIdx = idx >= 0 ? idx : 0
      setSelectedIdx(safeIdx)
      setSelectedSo(initialData.soNo || (list[safeIdx]?.so || currentJobId))
      setStoreName(initialData.storeName || (list[safeIdx]?.store || currentCustomerName || ""))
      setMovedQty(initialData.movedQty || 0)
      // รองรับข้อมูลเก่า: ถ้ายังไม่มี floors[] แต่มี floorClimbQty เดิม (ค่าเดิม = เลขชั้น) แปลงเป็น 1 รายการ
      if (Array.isArray(initialData.floors) && initialData.floors.length > 0) {
        setFloors(initialData.floors)
      } else if (initialData.floorClimbQty && initialData.floorClimbQty > 0) {
        setFloors([{ floor: initialData.floorClimbQty, qty: initialData.shelvedQty || 0 }])
      } else {
        setFloors([])
      }
      setApproverPhone(initialData.approverPhone || "")
      setApproverSigUrl(initialData.approverSignatureUrl || null)
      setNotes(initialData.notes || "")
      setSubDrops(Array.isArray(initialData.subDrops) ? initialData.subDrops : [])
    } else {
      setSelectedIdx(0)
      setSelectedSo(list[0]?.so || currentJobId)
      setStoreName(list[0]?.store || currentCustomerName || "")
    }
  }, [currentJobId, currentCustomerName, originalDestinations, initialData, isOpen])

  // เลือกจาก dropdown ด้วย index (ไม่ใช้ so เป็นค่า เพราะ so ซ้ำกันได้)
  const handleSelectIdx = (idx: number) => {
    setSelectedIdx(idx)
    const opt = soOptions[idx]
    if (opt) {
      setSelectedSo(opt.so)
      setStoreName(opt.store)
    }
  }

  // ขึ้นชั้น: แตะปุ่มชั้นเพื่อเปิด/ปิด, กรอกจำนวนกล่องแยกต่อชั้น
  const toggleFloor = (floor: number) => {
    setFloors(prev => {
      if (prev.some(f => f.floor === floor)) return prev.filter(f => f.floor !== floor)
      return [...prev, { floor, qty: 0 }].sort((a, b) => a.floor - b.floor)
    })
  }
  const setFloorQty = (floor: number, qty: number) => {
    setFloors(prev => prev.map(f => (f.floor === floor ? { ...f, qty: Math.max(0, qty) } : f)))
  }

  const handleSignatureSave = (blob: Blob | null) => {
    setApproverSigBlob(blob)
    if (blob) {
      const url = URL.createObjectURL(blob)
      setApproverSigUrl(url)
    } else {
      setApproverSigUrl(null)
    }
  }

  // จุดลงย่อย: เพิ่ม/ลบ/แก้ (จำกัดสูงสุด 2 จุด)
  const addSubDrop = () => setSubDrops(prev => (prev.length >= 2 ? prev : [...prev, ""]))
  const removeSubDrop = (i: number) => setSubDrops(prev => prev.filter((_, idx) => idx !== i))
  const updateSubDrop = (i: number, v: string) =>
    setSubDrops(prev => prev.map((s, idx) => (idx === i ? v : s)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanFloors = floors
      .filter(f => f.floor > 0)
      .sort((a, b) => a.floor - b.floor)
    onSave({
      soNo: selectedSo,
      storeName,
      movedQty,
      floors: cleanFloors,
      // legacy: จำนวนชั้น + กล่องรวม เพื่อความเข้ากันได้กับตัวอ่านเก่า
      floorClimbQty: cleanFloors.length,
      shelvedQty: cleanFloors.reduce((s, f) => s + (f.qty || 0), 0),
      approverPhone,
      approverSignatureUrl: approverSigUrl,
      approverSignatureBlob: approverSigBlob,
      notes,
      subDrops: subDrops.map(s => s.trim()).filter(Boolean).slice(0, 2)
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 text-white border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Package size={20} />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              แบบฟอร์มย้ายสินค้าและขึ้นชั้น
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            บันทึกรายละเอียดและลงลายเซ็นรับรองบริการหน้างาน
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Dropdown SO Selector & Manual Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Truck size={14} className="text-indigo-400" />
              เลือก SO / ใบงาน หรือระบุเลข SO
            </Label>
            <select
              value={selectedIdx}
              onChange={(e) => handleSelectIdx(Number(e.target.value))}
              className="w-full h-11 bg-slate-800 border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            >
              {soOptions.map((opt, i) => (
                <option key={i} value={i} style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                  {opt.so} - {opt.store}
                </option>
              ))}
            </select>
            <Input 
              value={selectedSo}
              onChange={(e) => setSelectedSo(e.target.value)}
              placeholder="ระบุเลข SO หรือแก้ไขเลข SO..."
              className="w-full h-11 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 text-sm text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold mt-2 placeholder:text-slate-500"
            />
          </div>

          {/* Moved Qty (Boxes) */}
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-200">จำนวนย้ายสินค้า (กล่อง)</p>
              <p className="text-[11px] text-slate-400">พิมพ์ตัวเลขหรือกดปุ่มบวก-ลบ</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-700 bg-slate-800 text-slate-200 shrink-0"
                onClick={() => setMovedQty(Math.max(0, movedQty - 1))}
              >
                <Minus size={14} />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                value={movedQty === 0 ? "" : movedQty}
                onChange={(e) => setMovedQty(Math.max(0, parseInt(e.target.value || "0", 10)))}
                placeholder="0"
                className="w-16 h-10 bg-slate-900 border-slate-700 text-center font-black text-white text-base rounded-xl focus-visible:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-700 bg-slate-800 text-slate-200 shrink-0"
                onClick={() => setMovedQty(movedQty + 1)}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Floor Climb Selector (Multi-select Pills) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-400" />
              ชั้นที่แบกขึ้น (เลือกได้หลายชั้น)
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((floor) => {
                const active = floors.some(f => f.floor === floor)
                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => toggleFloor(floor)}
                    className={`h-11 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30"
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                    }`}
                  >
                    ชั้น {floor}
                  </button>
                )
              })}
            </div>
            {floors.length === 0 && (
              <p className="text-[11px] text-slate-500">ไม่ได้ขึ้นชั้น — แตะเลือกชั้นถ้ามีการแบกขึ้น (เลือกได้มากกว่า 1 ชั้น)</p>
            )}
          </div>

          {/* Shelved Qty per selected floor */}
          {floors.map((entry) => (
            <div
              key={entry.floor}
              className="bg-indigo-950/40 p-3 rounded-2xl border border-indigo-900/50 flex items-center justify-between animate-in fade-in duration-300"
            >
              <div>
                <p className="text-sm font-bold text-indigo-200">จำนวนสินค้าขึ้นชั้น {entry.floor} (กล่อง)</p>
                <p className="text-[11px] text-indigo-400">จำนวนกล่องที่ยกขึ้นชั้น {entry.floor}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-indigo-800 bg-indigo-900/50 text-indigo-200 shrink-0"
                  onClick={() => setFloorQty(entry.floor, entry.qty - 1)}
                >
                  <Minus size={14} />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={entry.qty === 0 ? "" : entry.qty}
                  onChange={(e) => setFloorQty(entry.floor, parseInt(e.target.value || "0", 10))}
                  placeholder="0"
                  className="w-16 h-10 bg-indigo-950 border-indigo-700 text-center font-black text-indigo-100 text-base rounded-xl focus-visible:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-indigo-800 bg-indigo-900/50 text-indigo-200 shrink-0"
                  onClick={() => setFloorQty(entry.floor, entry.qty + 1)}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          ))}

          {/* จุดลงย่อย (แบ่งลงโกดัง ฯลฯ) — พบเฉพาะหน้างาน */}
          <div className="space-y-2 bg-amber-950/30 p-3 rounded-2xl border border-amber-900/40">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                  <Package size={14} /> ลูกค้าแจ้งแบ่งลงจุดอื่น?
                </p>
                <p className="text-[11px] text-amber-400/90">
                  เช่น ลงหน้าร้านบางส่วน อีกส่วนลงโกดัง — ระบบจะเพิ่มเป็นจุดส่งใหม่ในงานนี้ให้อัตโนมัติ
                </p>
              </div>
              {subDrops.length < 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSubDrop}
                  className="h-8 shrink-0 rounded-xl border-amber-700/60 bg-amber-900/40 text-amber-200 text-xs font-bold hover:bg-amber-900/70"
                >
                  <Plus size={13} className="mr-1" /> เพิ่มจุด
                </Button>
              )}
            </div>

            {subDrops.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 animate-in fade-in duration-200">
                <Input
                  value={sub}
                  onChange={(e) => updateSubDrop(i, e.target.value)}
                  placeholder={`ชื่อจุดลงย่อยที่ ${i + 1} (เช่น โกดัง)`}
                  className="h-11 flex-1 bg-slate-800 border-amber-800/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus-visible:ring-amber-500 font-medium"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeSubDrop(i)}
                  className="h-11 w-11 shrink-0 rounded-xl border-amber-800/50 bg-amber-950/40 text-amber-300"
                >
                  <Minus size={15} />
                </Button>
              </div>
            ))}
          </div>

          {/* Approver Signature Pad */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <PenTool size={14} className="text-indigo-400" />
              ลายเซ็นผู้เซ็นรับรอง (ลายมือชื่อลูกค้า/ผู้รับ)
            </Label>
            <div className="bg-white rounded-2xl p-2 border border-slate-700">
              <SignaturePad onSave={handleSignatureSave} />
            </div>
          </div>

          {/* Approver Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Phone size={14} className="text-indigo-400" />
              เบอร์โทรศัพท์ผู้เซ็นรับรอง
            </Label>
            <Input
              type="tel"
              placeholder="ระบุเบอร์โทรศัพท์ผู้เซ็นรับรอง..."
              value={approverPhone}
              onChange={(e) => setApproverPhone(e.target.value)}
              className="h-11 bg-slate-800 border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 font-medium"
            />
          </div>

          <DialogFooter className="pt-2 flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
