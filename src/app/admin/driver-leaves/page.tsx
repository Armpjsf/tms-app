import { createClient } from "@/utils/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Clock, FileText, ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/actions/auth-actions"
import { cn } from "@/lib/utils"
import { LeaveActionsClient } from "./leave-actions-client"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function AdminLeavesPage() {
  const session = await getAdminSession()
  if (!session) redirect("/login")

  const supabase = await createClient()
  const { data: leaves, error } = await supabase
    .from('Driver_Leaves')
    .select(`
      *,
      Drivers:Driver_ID (
        Driver_Name,
        Phone_Number
      )
    `)
    .order('Created_At', { ascending: false })

  return (
    <div className="space-y-12 pb-32 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-primary/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Centre
                </Link>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.3)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Calendar size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            Personnel Leaves
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Operator Availability & Schedule Matrix</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-4 relative z-10">
                <div className="bg-primary/10 border border-primary/20 px-8 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-primary font-black uppercase tracking-widest italic">{leaves?.filter(l => l.Status === 'Pending').length || 0} รายการรอตรวจ</span>
                </div>
            </div>
        </div>

        <div className="grid gap-6">
              {(!leaves || leaves.length === 0) ? (
                  <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed">
                      <Calendar className="mx-auto mb-4 text-slate-300" size={64} />
                      <p className="text-slate-400 font-black text-xl uppercase tracking-widest">ไม่มีคำขอลาในขณะนี้</p>
                  </div>
              ) : (
                  leaves.map((leave) => (
                      <Card key={leave.id} className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden group">
                          <div className={cn(
                              "h-2",
                              leave.Status === 'Approved' ? "bg-emerald-500" : 
                              leave.Status === 'Rejected' ? "bg-red-500" : "bg-amber-500"
                          )} />
                          <CardContent className="p-8">
                              <div className="flex flex-col md:flex-row justify-between gap-6">
                                  <div className="space-y-6 flex-1">
                                      <div className="flex items-center gap-4">
                                          <div className={cn(
                                              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                                              leave.Status === 'Approved' ? "bg-emerald-50" : 
                                              leave.Status === 'Rejected' ? "bg-red-50" : "bg-slate-100"
                                          )}>
                                              <User size={32} strokeWidth={2.5} className={cn(
                                                  leave.Status === 'Approved' ? "text-emerald-600" : 
                                                  leave.Status === 'Rejected' ? "text-red-600" : "text-slate-600"
                                              )} />
                                          </div>
                                          <div>
                                              <h3 className="text-2xl font-black text-slate-900 leading-tight">คุณ {leave.Drivers?.Driver_Name || 'ไม่ระบุชื่อ'}</h3>
                                              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                                                  <Badge variant="secondary" className="rounded-lg">{leave.Leave_Type}</Badge>
                                                  <span>•</span>
                                                  <span>{leave.Drivers?.Phone_Number || 'ไม่มีเบอร์ติดต่อ'}</span>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                              <Calendar className="text-primary" size={20} />
                                              <div>
                                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ช่วงเวลาที่ลา</p>
                                                  <p className="text-slate-900 font-bold">
                                                      {new Date(leave.Start_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                                      {" - "}
                                                      {new Date(leave.End_Date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                                  </p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                              <Clock className="text-accent" size={20} />
                                              <div>
                                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะรายการ</p>
                                                  <p className={cn(
                                                      "font-black uppercase tracking-widest",
                                                      leave.Status === 'Approved' ? "text-emerald-600" : 
                                                      leave.Status === 'Rejected' ? "text-red-600" : "text-amber-600"
                                                  )}>
                                                      {leave.Status === 'Approved' ? 'อนุมัติแล้ว' : 
                                                       leave.Status === 'Rejected' ? 'ปฏิเสธแล้ว' : 'รอการพิจารณา'}
                                                  </p>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 font-bold relative overflow-hidden">
                                          <div className="flex items-center gap-2 mb-2 text-slate-400 relative z-10">
                                              <FileText size={16} />
                                              <span className="text-[10px] font-black uppercase tracking-widest">เหตุผลการลา / บันทึกเพิ่มเติม</span>
                                          </div>
                                          <p className="relative z-10">"{leave.Reason || 'ไม่ได้ระบุเหตุผล'}"</p>
                                          <FileText size={80} className="absolute bottom-[-20%] right-[-5%] text-slate-200/50 -rotate-12" />
                                      </div>
                                  </div>

                                  {leave.Status === 'Pending' && (
                                      <LeaveActionsClient leaveId={leave.id} />
                                  )}
                              </div>
                          </CardContent>
                      </Card>
                  ))
              )}
          </div>
    </div>
  )
}
