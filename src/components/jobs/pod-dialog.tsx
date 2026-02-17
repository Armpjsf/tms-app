"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, ExternalLink } from "lucide-react"
import Image from "next/image"

type PODDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: any
}

export function PODDialog({ open, onOpenChange, job }: PODDialogProps) {


  const photos = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',').filter(Boolean) : []
  const signature = job.Signature_Url

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            หลักฐานการส่งสินค้า (POD) - {job.Job_ID}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photos Grid */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">รูปภาพสินค้า / สถานที่ส่ง ({photos.length})</h3>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((url: string, index: number) => (
                  <div 
                    key={index} 
                    className="group relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black/40 cursor-pointer hover:border-indigo-500 transition-all"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <Image 
                      src={url} 
                      alt={`POD ${index + 1}`} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 text-slate-500">
                ไม่มีรูปภาพ
              </div>
            )}
          </div>

          {/* Signature */}
          <div>
             <h3 className="text-sm font-medium text-slate-400 mb-3">ลายเซ็นผู้รับ</h3>
             {signature ? (
               <div className="relative h-40 w-full md:w-80 border border-slate-700 rounded-lg bg-white/5 mx-auto md:mx-0">
                  <Image 
                      src={signature} 
                      alt="Signature" 
                      fill 
                      className="object-contain p-4 invert" 
                  />
               </div>
             ) : (
                <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 text-slate-500 w-full md:w-80">
                  ไม่มีลายเซ็น
                </div>
             )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg text-sm">
             <div>
                <p className="text-slate-500">ผู้ส่ง (Driver)</p>
                <p className="text-white font-medium">{job.Driver_Name || '-'}</p>
             </div>
             <div>
                <p className="text-slate-500">ทะเบียนรถ</p>
                <p className="text-white font-medium">{job.Vehicle_Plate || '-'}</p>
             </div>
             <div>
                <p className="text-slate-500">เวลาส่ง (Delivery Date)</p>
                <p className="text-white font-medium">
                    {job.Delivery_Date ? new Date(job.Delivery_Date).toLocaleString('th-TH') : '-'}
                </p>
             </div>
             <div>
                <p className="text-slate-500">สถานะ</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    job.Job_Status === 'Completed' || job.Job_Status === 'Delivered' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                    {job.Job_Status}
                </span>
             </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
                ปิดหน้าต่าง
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
