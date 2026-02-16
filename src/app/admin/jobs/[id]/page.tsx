import Link from "next/link"
import { notFound } from "next/navigation"
import { getJobById } from "@/lib/supabase/jobs"
import { getDriverRouteForDate } from "@/lib/supabase/gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, Truck, User, Phone, Package, FileText, Navigation } from "lucide-react"
import JobMapClient from "@/components/maps/job-map-client"
import { AdminJobActions } from "@/components/admin/admin-job-actions"

// Force dynamic rendering (server-side) to ensure fresh data
export const dynamicParams = true
export const revalidate = 0

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJobById(id)

  if (!job) {
    notFound()
  }

  // Fetch Route History if driver and date exist
  let routeHistory: [number, number][] = []
  if (job.Driver_ID && job.Plan_Date) {
    const logs = await getDriverRouteForDate(job.Driver_ID, job.Plan_Date)
    routeHistory = logs.map(log => [log.Latitude, log.Longitude])
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/admin/jobs">
          <Button variant="outline" size="icon" className="h-10 w-10 border-slate-700 bg-slate-900 hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Job # {job.Job_ID}</h1>
            <StatusBadge status={job.Job_Status} />
          </div>
          <p className="text-slate-400 text-sm mt-1">
          </p>
        </div>
        <div className="ml-auto">
            <AdminJobActions jobId={job.Job_ID} currentStatus={job.Job_Status || 'New'} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Column (Left) */}
        <div className="md:col-span-2 space-y-6">
            
          {/* Customer & Route Info */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-blue-400" />
                ข้อมูลลูกค้าและการจัดส่ง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-slate-500">ชื่อลูกค้า</label>
                    <p className="text-slate-200 font-medium">{job.Customer_Name}</p>
                </div>
                <div>
                    <label className="text-xs text-slate-500">เส้นทาง (Route)</label>
                    <p className="text-slate-200 font-medium">{job.Route_Name}</p>
                </div>
                <div>
                    <label className="text-xs text-slate-500">วันที่ตามแผน</label>
                    <div className="flex items-center gap-2 text-slate-200">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        {new Date(job.Plan_Date || "").toLocaleDateString("th-TH")}
                    </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                <div className="flex gap-3">
                    <div className="mt-1"><div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" /></div>
                    <div>
                        <label className="text-xs text-slate-500">ต้นทาง</label>
                        <p className="text-slate-300">{job.Origin_Location || "ไม่ได้ระบุ"}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="mt-1"><MapPin className="h-4 w-4 text-emerald-500" /></div>
                    <div>
                        <label className="text-xs text-slate-500">ปลายทาง</label>
                        <p className="text-slate-300">{job.Dest_Location || "ไม่ได้ระบุ"}</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Route History Map */}
           {routeHistory.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Navigation className="h-5 w-5 text-indigo-400" />
                        เส้นทางการวิ่งรถ (GPS History)
                    </CardTitle>
                </CardHeader>
                <JobMapClient routeHistory={routeHistory} />
            </Card>
          )}

          {/* Proof of Delivery (POD) Section */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-emerald-400" />
                หลักฐานการจัดส่ง (E-POD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.Job_Status === "Delivered" || job.Job_Status === "Completed" ? (
                <div className="space-y-6">
                    {/* 1. Digital Report (Smart POD) - First Image */}
                    {(() => {
                        const proofUrls = job.Photo_Proof_Url ? job.Photo_Proof_Url.split(',') : []
                        const reportUrl = proofUrls.length > 0 ? proofUrls[0] : null
                        const itemPhotos = proofUrls.length > 1 ? proofUrls.slice(1) : []

                        return (
                            <>
                                {/* Report Viewer */}
                                <div>
                                    <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-400" /> ใบเสร็จ/ใบส่งสินค้า (Digital Report)
                                    </h3>
                                    {reportUrl ? (
                                        <div className="relative w-full aspect-[1/1.4] md:aspect-[1.4/1] bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={reportUrl} 
                                                alt="Digital POD Report" 
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <a href={reportUrl} target="_blank" rel="noreferrer">
                                                    <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black text-xs h-8">
                                                        เปิดไฟล์เต็ม
                                                    </Button>
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                            ไม่พบไฟล์ใบงาน
                                        </div>
                                    )}
                                </div>

                                {/* Product Photos Grid */}
                                {itemPhotos.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                            <Package className="h-4 w-4 text-emerald-400" /> รูปถ่ายสินค้าเพิ่มเติม ({itemPhotos.length})
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {itemPhotos.map((url, i) => (
                                                <div key={i} className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-700 group cursor-pointer">
                                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={url} 
                                                        alt={`Product ${i+1}`} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <a href={url} target="_blank" rel="noreferrer">
                                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                                                                <Navigation className="h-4 w-4 rotate-45" />
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    })()}
                    
                    {/* Signature Section */}
                    <div className="border-t border-slate-800 pt-6">
                         <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> ลายเซ็นลูกค้า (Digital Signature)
                        </h3>
                        {job.Signature_Url ? (
                             <div className="relative h-32 w-64 bg-white rounded-lg overflow-hidden border border-slate-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={job.Signature_Url} 
                                    alt="Customer Signature" 
                                    className="w-full h-full object-contain p-2"
                                />
                            </div>
                        ) : (
                            <div className="h-32 w-64 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 bg-slate-950">
                                <p>ไม่มีลายเซ็น</p>
                            </div>
                        )}
                    </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 bg-slate-950/50">
                    <p>ยังไม่มีข้อมูล POD (งานยังไม่เสร็จสิ้น)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info Column (Right) */}
        <div className="space-y-6">
            {/* Driver Info */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                        <Truck className="h-4 w-4 text-indigo-400" />
                        ข้อมูลคนขับ
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-200 font-medium">{job.Driver_Name || "ไม่ระบุ"}</p>
                            <p className="text-xs text-slate-500">{job.Driver_ID || "-"}</p>
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-800 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">ทะเบียนรถ</span>
                            <span className="text-slate-300 font-mono">{job.Vehicle_Plate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">เบอร์โทร</span>
                            <span className="text-slate-300">-</span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                        <Phone className="h-4 w-4 mr-2" /> โทรหาคนขับ
                    </Button>
                </CardContent>
            </Card>

            {/* Cost & Price */}
            <Card className="bg-slate-900 border-slate-800">
                 <CardHeader>
                    <CardTitle className="text-white text-base">ค่าขนส่ง</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ราคาลูกค้า</span>
                        <span className="text-emerald-400 font-medium">฿{job.Price_Cust_Total?.toLocaleString() || "0"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ต้นทุนคนขับ</span>
                        <span className="text-rose-400 font-medium">฿{job.Cost_Driver_Total?.toLocaleString() || "0"}</span>
                     </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
    let colorClass = "bg-slate-500/10 text-slate-500" // Default
  
    switch (status) {
      case "New": colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20"; break
      case "Assigned": colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20"; break
      case "In Progress":
      case "In Transit": colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"; break
      case "Delivered":
      case "Completed": colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; break
      case "Cancelled": colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20"; break
      case "Failed": colorClass = "bg-red-500/10 text-red-400 border-red-500/20"; break
    }
  
    return (
      <Badge variant="outline" className={`border ${colorClass} px-3 py-1 text-sm`}>
        {status}
      </Badge>
    )
}
