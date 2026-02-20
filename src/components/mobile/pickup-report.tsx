"use client"

import { Job } from "@/lib/supabase/jobs"
import { forwardRef } from "react"

type Props = {
  job: Job
  photos: string[] // Object URLs
  signature: string | null // Object URL
}

export const PickupReport = forwardRef<HTMLDivElement, Props>(({ job, photos, signature }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black p-8 font-sans w-[800px] mx-auto absolute top-[-9999px] left-[-9999px]">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold uppercase tracking-wide">ใบรับสินค้า / Pickup Note</h1>
           <p className="text-sm text-slate-500 mt-1">Proof of Pickup (POP)</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold">{job.Job_ID}</h2>
            <p className="text-sm">{new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            })}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-2">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">ข้อมูลการรับงาน (Collection Info)</h3>
            <div className="grid grid-cols-[100px_1fr] text-sm gap-y-1">
                <span className="text-slate-500">ลูกค้า:</span>
                <span className="font-medium">{job.Customer_Name}</span>
                
                <span className="text-slate-500">ทะเบียนรถ:</span>
                <span>{job.Vehicle_Plate || "-"}</span>
                
                <span className="text-slate-500">คนขับ:</span>
                <span>{job.Driver_Name || "-"}</span>
            </div>
        </div>

        <div className="space-y-2">
            <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">สถานที่รับสินค้า (Origin)</h3>
            <div className="space-y-3 text-sm">
                <div>
                    <span className="text-slate-500 text-xs block">ต้นทาง</span>
                    <p className="font-medium">{job.Origin_Location || "-"}</p>
                </div>
                <div>
                    <span className="text-slate-500 text-xs block">ไปส่งที่ (Destination)</span>
                    <p>{job.Dest_Location || "-"}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Items Summary */}
      <div className="mb-8">
        <h3 className="font-bold border-b border-slate-300 pb-1 mb-2">รายละเอียดสินค้า (Items)</h3>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600">
                <tr>
                    <th className="p-2 w-12 text-center">#</th>
                    <th className="p-2">รายการ (Description)</th>
                    <th className="p-2 text-right">จำนวน</th>
                    <th className="p-2 text-center">สถานะการรับ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                <tr>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2">{job.Route_Name || "สินค้าทั่วไป (General Cargo)"}</td>
                    <td className="p-2 text-right">{job.Total_Drop || 1} Drop</td>
                    <td className="p-2 text-center text-amber-600 font-bold">รับสินค้าแล้ว</td>
                </tr>
            </tbody>
        </table>
      </div>

      {/* Photos */}
      <div className="mb-8 break-inside-avoid">
        <h3 className="font-bold border-b border-slate-300 pb-1 mb-4">รูปถ่ายขณะรับสินค้า (Pickup Photos)</h3>
        <div className="grid grid-cols-3 gap-4">
            {photos.map((src, i) => (
                <div key={i} className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Pickup" className="w-full h-full object-cover" />
                </div>
            ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-end break-inside-avoid">
        <div className="w-64 border border-slate-300 rounded p-4 text-center">
             <p className="text-xs text-slate-500 mb-2">ลายเซ็นผู้ส่งมอบสินค้า (Dispatcher Signature)</p>
             <div className="h-24 flex items-center justify-center mb-2">
                {signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signature} alt="Signature" className="max-h-full max-w-full" />
                ) : (
                    <span className="text-slate-200 italic">No Signature</span>
                )}
             </div>
             <div className="border-t border-slate-300 pt-2">
                <p className="font-medium text-sm">ผู้ส่งมอบสินค้า</p>
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

PickupReport.displayName = "PickupReport"
