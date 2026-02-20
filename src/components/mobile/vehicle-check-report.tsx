"use client"

import { forwardRef } from "react"

type Props = {
  driverName: string
  vehiclePlate: string
  items: Record<string, boolean>
  photos: string[] // Object URLs
  signature: string | null // Object URL
}

export const VehicleCheckReport = forwardRef<HTMLDivElement, Props>(({ driverName, vehiclePlate, items, photos, signature }, ref) => {
  const checklist = [
    "น้ำมันเครื่อง", "น้ำในหม้อน้ำ", "ลมยาง", "ไฟเบรค/ไฟเลี้ยว", 
    "สภาพยางรถยนต์", "อุปกรณ์ฉุกเฉิน", "เอกสารประจำรถ"
  ]

  const passedCount = Object.values(items).filter(Boolean).length
  const totalCount = checklist.length
  const status = passedCount === totalCount ? "Pass (ปกติ)" : "Fail (พบจุดผิดปกติ)"

  return (
    <div ref={ref} className="bg-white text-black p-8 font-sans w-[800px] mx-auto absolute top-[-9999px] left-[-9999px]">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-wide">รายงานการตรวจสอบสภาพรถ / Vehicle Inspection Report</h1>
           <p className="text-sm text-slate-500 mt-1">ใบแจ้งการตรวจสอบรายวัน (Daily Check)</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold">{vehiclePlate}</h2>
            <p className="text-sm">{new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            })}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-2">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">ข้อมูลผู้ตรวจสอบ</h3>
            <div className="grid grid-cols-[100px_1fr] text-sm gap-y-1">
                <span className="text-slate-500">ผู้ตรวจสอบ:</span>
                <span className="font-medium">{driverName}</span>
                
                <span className="text-slate-500">ทะเบียนรถ:</span>
                <span>{vehiclePlate}</span>
                
                <span className="text-slate-500">สถานะรวม:</span>
                <span className={passedCount === totalCount ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                    {status}
                </span>
            </div>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="mb-8">
        <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">รายการที่ตรวจสอบ (Checklist Items)</h3>
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600">
                <tr>
                    <th className="p-2 border border-slate-300 w-12 text-center">#</th>
                    <th className="p-2 border border-slate-300">รายการตรวจสอบ</th>
                    <th className="p-2 border border-slate-300 text-center w-24">ผลการตรวจ</th>
                </tr>
            </thead>
            <tbody>
                {checklist.map((item, i) => (
                    <tr key={item}>
                        <td className="p-2 border border-slate-300 text-center">{i + 1}</td>
                        <td className="p-2 border border-slate-300">{item}</td>
                        <td className="p-2 border border-slate-300 text-center">
                            {items[item] ? (
                                <span className="text-emerald-600 font-bold">✓ ผ่าน</span>
                            ) : (
                                <span className="text-red-500 font-bold">✗ ไม่ผ่าน</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-4">รูปถ่ายประกอบการตรวจสอบ (Inspection Photos)</h3>
            <div className="grid grid-cols-3 gap-4">
                {photos.map((src, i) => (
                    <div key={i} className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Check" className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* Signatures */}
      <div className="flex justify-end break-inside-avoid">
        <div className="w-64 border border-slate-300 rounded p-4 text-center">
             <p className="text-xs text-slate-500 mb-2">ลายเซ็นผู้ขับขี่ (Driver Signature)</p>
             <div className="h-24 flex items-center justify-center mb-2">
                {signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signature} alt="Signature" className="max-h-full max-w-full" />
                ) : (
                    <span className="text-slate-200 italic">No Signature</span>
                )}
             </div>
             <div className="border-t border-slate-300 pt-2">
                <p className="font-medium text-sm">{driverName}</p>
                <p className="text-xs text-slate-400">{new Date().toLocaleString('th-TH')}</p>
             </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
        Generated by TMS ePOD System
      </div>
    </div>
  )
})

VehicleCheckReport.displayName = "VehicleCheckReport"
