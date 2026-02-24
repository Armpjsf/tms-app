import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createAdminClient } from "@/utils/supabase/server"
import { Truck, User, CheckCircle2, XCircle, FileText, Image as ImageIcon, PenTool } from "lucide-react"
export const revalidate = 0

const STANDARD_CHECKLIST = [
    "น้ำมันเครื่อง", "น้ำในหม้อน้ำ", "ลมยาง", "ไฟเบรค/ไฟเลี้ยว", 
    "สภาพยางรถยนต์", "อุปกรณ์ฉุกเฉิน", "เอกสารประจำรถ"
]

export default async function AdminVehicleChecksPage() {
    const supabase = createAdminClient()
    
    const { data: checks, error } = await supabase
        .from('Vehicle_Checks')
        .select('*')
        .order('Check_Date', { ascending: false })
        .limit(100)

    if (error) {
        console.error("Error fetching vehicle checks:", error)
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Truck className="text-indigo-500" />
                    สรุปการตรวจเช็ครถ (Driver Inspections)
                </h1>
                <p className="text-muted-foreground mt-2">รายการตรวจสอบสภาพรถประจำวันจากคนขับ</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="bg-card border-border">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border">
                                    <TableHead className="w-[180px]">วัน-เวลา</TableHead>
                                    <TableHead>ทะเบียนรถ</TableHead>
                                    <TableHead>คนขับ</TableHead>
                                    <TableHead>ผลการตรวจ</TableHead>
                                    <TableHead>รูปภาพ / ลายเซ็น</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checks?.map((check) => {
                                    const items = (check.Passed_Items || {}) as Record<string, boolean>
                                    const failedItems = STANDARD_CHECKLIST.filter(item => !items[item])
                                    const isPass = failedItems.length === 0

                                    return (
                                        <TableRow key={check.id} className="border-border hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{new Date(check.Check_Date).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(check.Check_Date).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Truck size={16} className="text-slate-400" />
                                                    <span className="font-bold uppercase">{check.Vehicle_Plate}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-slate-400" />
                                                    <span>{check.Driver_Name || check.Driver_ID}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        {isPass ? (
                                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                                        ) : (
                                                            <XCircle size={16} className="text-red-500" />
                                                        )}
                                                        <span className={isPass ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                                                            {isPass ? "ผ่านทุกรายการ" : `ไม่ผ่าน ${failedItems.length} รายการ`}
                                                        </span>
                                                    </div>
                                                    {!isPass && (
                                                        <p className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                                                            {failedItems.join(", ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {check.Photo_Urls && (
                                                        <>
                                                            {/* First photo is the Smart Report */}
                                                            <a 
                                                                href={check.Photo_Urls.split(',')[0]} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200"
                                                            >
                                                                <FileText size={14} />
                                                                เปิดรายงาน
                                                            </a>

                                                            {/* Other photos */}
                                                            {check.Photo_Urls.split(',').length > 1 && (
                                                                <div className="flex gap-1">
                                                                    {check.Photo_Urls.split(',').slice(1).map((url: string, idx: number) => (
                                                                        <a 
                                                                            key={idx}
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border hover:bg-slate-200 transition-colors"
                                                                            title={`รูปถ่าย ${idx + 1}`}
                                                                        >
                                                                            <ImageIcon size={14} />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {check.Signature_Url && (
                                                        <a 
                                                            href={check.Signature_Url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200"
                                                            title="ดูรายละเอียดลายเซ็น"
                                                        >
                                                            <PenTool size={14} />
                                                            ลายเซ็น
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {(!checks || checks.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            ไม่พบรายการตรวจเช็ครถ
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
