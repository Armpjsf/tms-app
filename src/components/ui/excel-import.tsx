"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Logger from "@/lib/utils/logger"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Upload, FileSpreadsheet, Loader2, Download, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface ExcelImportProps {
  trigger: React.ReactNode
  title: string
  description?: string
  onImport: (data: Record<string, unknown>[]) => Promise<{ success: boolean; message: string; error?: string }>;
  templateData?: Record<string, unknown>[]
  templateFilename?: string
}

export function ExcelImport({
  trigger,
  title,
  description = "อัปโหลดไฟล์ Excel (.xlsx, .xls) เพื่อนำเข้าข้อมูล",
  onImport,
  templateData,
  templateFilename = "template.xlsx",
}: ExcelImportProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setLoading(true)

    try {
      const data = await parseExcel(selectedFile)
      setPreviewData(data)
      if (data.length === 0) {
        setError("ไม่พบข้อมูลในไฟล์")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError("ไม่สามารถอ่านไฟล์ได้: " + msg)
    } finally {
      setLoading(false)
    }
  }

  const parseExcel = (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet)
          // Fix: Ensure data is plain objects by stripping any non-serializable properties (e.g. prototypes)
          const plainData = JSON.parse(JSON.stringify(jsonData))
          resolve(plainData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsBinaryString(file)
    })
  }

  const handleImport = async () => {
    if (!previewData.length) return

    setLoading(true)
    setError(null)

    try {
      const result = await onImport(previewData)
      if (result.success) {
        setOpen(false)
        setFile(null)
        setPreviewData([])
        toast.success(result.message || "นำเข้าข้อมูลสำเร็จ")
        router.refresh()
      } else {
        Logger.error("Excel import failed:", result.error)
        toast.error(result.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล")
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการนำเข้า")
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    if (!templateData) return
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, templateFilename)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-white border-gray-200 text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-gray-500">{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {templateData && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2 border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                <Download size={14} /> โหลดแบบฟอร์ม (Template)
              </Button>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? "border-blue-500/50 bg-blue-500/5" : "border-gray-200 hover:border-slate-500 hover:bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-2">
              {file ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                  <p className="font-medium text-emerald-500">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {previewData.length > 0 ? `พบข้อมูล ${previewData.length} รายการ` : "กำลังอ่านไฟล์..."}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400" />
                  <p className="text-gray-700">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                  <p className="text-xs text-gray-400">รองรับไฟล์ .xlsx, .xls</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">ผิดพลาด</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {previewData.length > 0 && !error && (
             <div className="max-h-[200px] overflow-auto rounded-md border border-gray-200">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                            {Object.keys(previewData[0]).slice(0, 5).map(key => (
                                <th key={key} className="p-2">{key}</th>
                            ))}
                            {Object.keys(previewData[0]).length > 5 && <th className="p-2">...</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {previewData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                {Object.values(row).slice(0, 5).map((val: unknown, j) => (
                                    <td key={j} className="p-2 text-gray-500">{String(val)}</td>
                                ))}
                                {Object.values(row).length > 5 && <td className="p-2 text-gray-400">...</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {previewData.length > 5 && (
                    <p className="text-xs text-center p-2 text-gray-400 bg-white border-t border-gray-200">
                        ...และอีก {previewData.length - 5} รายการ
                    </p>
                )}
             </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading || previewData.length === 0}
            className="bg-emerald-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            นำเข้าข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
