"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2, Download, Upload, Check, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { Driver } from "@/lib/supabase/drivers"

type ImportDriversDialogProps = {
  createBulkDrivers?: (data: Partial<Driver>[]) => Promise<{ success: boolean; message: string }>
  branches?: { Branch_ID: string; Branch_Name: string }[]
  subcontractors?: { Sub_ID: string; Sub_Name: string }[]
  trigger?: React.ReactNode
}

export function ImportDriversDialog({
  createBulkDrivers,
  branches = [],
  subcontractors = [],
  trigger
}: ImportDriversDialogProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileData, setFileData] = useState<any[] | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          "รหัสคนขับ": "DRV-999",
          "ชื่อ-นามสกุล": "นายสมชาย ตั้งมั่น",
          "เบอร์โทร": "0812345678",
          "รหัสผ่าน": "123456",
          "ทะเบียนรถ": "3ฒฆ1234",
          "จังหวัด": "กรุงเทพมหานคร",
          "ประเภทรถ": "4 W",
          "วันหมดอายุใบขับขี่": "2030-12-31",
          "ธนาคาร": "กสิกรไทย",
          "เลขบัญชี": "1234567890",
          "ชื่อบัญชี": "สมชาย ตั้งมั่น",
          "สังกัด (รหัสผู้รับเหมาช่วง)": subcontractors[0]?.Sub_ID || "SUB-001",
          "สาขา": branches[0]?.Branch_ID || "HQ"
        }
      ]

      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "รายชื่อคนขับ")
      
      // Auto-fit columns
      const maxLen = 20
      worksheet["!cols"] = Array(12).fill({ wch: maxLen })

      XLSX.writeFile(workbook, "template_drivers_import.xlsx")
      toast.success("ดาวน์โหลดเทมเพลตเรียบร้อยแล้ว")
    } catch (error) {
      console.error(error)
      toast.error("ไม่สามารถสร้างเทมเพลตได้")
    }
  }

  // 2. Parse Uploaded Excel File Client-Side
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
        
        if (data.length === 0) {
          toast.error("ไม่พบข้อมูลในไฟล์ Excel")
          setFileData(null)
          return
        }
        
        setFileData(data)
        toast.success(`โหลดข้อมูลสำเร็จ: ${data.length} รายการ`)
      } catch (err) {
        console.error(err)
        toast.error("โครงสร้างไฟล์ Excel ไม่ถูกต้องหรือไม่รองรับ")
        setFileData(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  // 3. Submit data to Server Action
  const handleImportSubmit = async () => {
    if (!fileData || !createBulkDrivers) return
    setLoading(true)

    try {
      const result = await createBulkDrivers(fileData)
      if (result.success) {
        toast.success(result.message || "นำเข้าข้อมูลสำเร็จ")
        setOpen(false)
        setFileData(null)
        setFileName("")
        router.refresh()
      } else {
        toast.error(result.message || "เกิดข้อผิดพลาดในการนำเข้า")
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] flex flex-col bg-card/95 backdrop-blur-2xl border-border/5 text-foreground p-0 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-purple-500" />
        
        <DialogHeader className="p-8 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="text-emerald-500" size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                นำเข้าข้อมูลคนขับจาก Excel
              </DialogTitle>
              <p className="text-muted-foreground text-xs mt-1">
                อัปโหลดไฟล์ Excel เพื่อเพิ่มหรืออัปเดตข้อมูลพนักงานขับรถพร้อมกันหลายคน
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
          {/* Download Template Button */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">ดาวน์โหลดเทมเพลต Excel</h4>
              <p className="text-muted-foreground text-xs">
                ดาวน์โหลดไฟล์แบบฟอร์มเพื่อกรอกข้อมูลคนขับให้ตรงตามโครงสร้างของระบบ
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate} 
              className="gap-2 shrink-0 rounded-xl"
            >
              <Download size={14} />
              ดาวน์โหลด
            </Button>
          </div>

          {/* File Upload Selector */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-all rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/10 hover:bg-muted/20 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
            </div>
            {fileName ? (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground line-clamp-1">{fileName}</p>
                <p className="text-emerald-500 text-xs flex items-center justify-center gap-1">
                  <Check size={12} />
                  เลือกไฟล์เรียบร้อยแล้ว
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">คลิกเพื่อเลือกไฟล์ Excel</p>
                <p className="text-muted-foreground text-xs">รองรับไฟล์นามสกุล .xlsx หรือ .xls</p>
              </div>
            )}
          </div>

          {/* Excel Preview Data */}
          {fileData && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                ตัวอย่างข้อมูลที่จะนำเข้า ({fileData.length} รายการ)
              </h4>
              <div className="border border-border rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">ชื่อคนขับ</th>
                      <th className="p-3">เบอร์โทร</th>
                      <th className="p-3">ทะเบียนรถ</th>
                      <th className="p-3">ประเภทรถ</th>
                      <th className="p-3">สาขา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {fileData.slice(0, 5).map((row, i) => {
                      const name = row["ชื่อ-นามสกุล"] || row["ชื่อคนขับ"] || row["Driver_Name"] || "ไม่ระบุ";
                      const phone = row["เบอร์โทร"] || row["เบอร์โทรศัพท์"] || row["Mobile_No"] || "ไม่ระบุ";
                      const plate = row["ทะเบียนรถ"] || row["ทะเบียน"] || row["Vehicle_Plate"] || "ไม่ระบุ";
                      const type = row["ประเภทรถ"] || row["Vehicle_Type"] || "4 W";
                      const branch = row["สาขา"] || row["Branch_ID"] || "HQ";
                      return (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="p-3 font-medium text-foreground">{name}</td>
                          <td className="p-3 text-muted-foreground">{phone}</td>
                          <td className="p-3 text-muted-foreground">{plate}</td>
                          <td className="p-3 text-muted-foreground">{type}</td>
                          <td className="p-3 text-muted-foreground">{branch}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {fileData.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-right italic">
                  * แสดงเฉพาะ 5 แถวแรกจากทั้งหมด {fileData.length} แถว
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-8 pt-4 flex-shrink-0 flex items-center justify-end gap-3 border-t border-border/10 bg-muted/10">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="rounded-xl px-5"
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={handleImportSubmit} 
            disabled={loading || !fileData}
            className="rounded-xl px-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Check size={14} />
            )}
            นำเข้าข้อมูลทั้งหมด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
