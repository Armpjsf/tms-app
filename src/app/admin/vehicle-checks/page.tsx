import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createAdminClient } from "@/utils/supabase/server"
import { Truck, User, CheckCircle2, XCircle } from "lucide-react"
import Image from "next/image"

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
        <DashboardLayout>
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
                                    const items = check.Passed_Items || {}
                                    const failedItems = Object.entries(items).filter(([key, v]) => v === false).map(([k]) => k)
                                    const isPass = failedItems.length === 0

                                    return (
                                        <TableRow key={check.id} className="border-border hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{new Date(check.Check_Date).toLocaleDateString('th-TH')}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(check.Check_Date).toLocaleTimeString('th-TH')}</span>
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
                                                <div className="flex items-center gap-3">
                                                    {check.Photo_Urls && (
                                                        <div className="flex gap-1">
                                                            {check.Photo_Urls.split(',').slice(0, 2).map((url: string, idx: number) => (
                                                                <div key={idx} className="relative w-8 h-8 rounded border border-border overflow-hidden bg-muted group">
                                                                    <Image src={url} alt="Check Photo" fill className="object-cover group-hover:scale-110 transition-transform" />
                                                                </div>
                                                            ))}
                                                            {check.Photo_Urls.split(',').length > 2 && (
                                                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border border-border">
                                                                    +{check.Photo_Urls.split(',').length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {check.Signature_Url && (
                                                        <div className="relative w-12 h-8 rounded border border-border overflow-hidden bg-white p-0.5">
                                                            <Image src={check.Signature_Url} alt="Signature" fill className="object-contain" />
                                                        </div>
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
        </DashboardLayout>
    )
}
