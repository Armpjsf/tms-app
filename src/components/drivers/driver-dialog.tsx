"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDriver, updateDriver, type DriverFormData } from "@/app/drivers/actions"
import { Loader2, User, Phone, Key, Calendar, Building2, Car, Landmark, Save, X } from "lucide-react"
import { Driver } from "@/lib/supabase/drivers"
import { BANKS } from "@/lib/constants/banks"
import { cn } from "@/lib/utils"

type DriverDialogProps = {
  mode?: 'create' | 'edit'
  driver?: Partial<Driver>
  vehicles?: { Vehicle_Plate: string; Brand?: string | null }[]
  subcontractors?: { Sub_ID: string; Sub_Name: string }[]
  branches?: { Branch_ID: string; Branch_Name: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DriverDialog({
  mode = 'create',
  driver,
  vehicles = [],
  subcontractors = [],
  branches = [],
  trigger,
  open,
  onOpenChange
}: DriverDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Driver_ID: driver?.Driver_ID || '',
    Driver_Name: driver?.Driver_Name || '',
    Mobile_No: driver?.Mobile_No || '',
    Password: driver?.Password || '',
    Vehicle_Plate: driver?.Vehicle_Plate || '',
    Active_Status: driver?.Active_Status || 'Active',
    Expire_Date: driver?.Expire_Date || '',
    Sub_ID: driver?.Sub_ID || '',
    Branch_ID: (driver as { Branch_ID?: string })?.Branch_ID || '',
    Bank_Name: driver?.Bank_Name || '',
    Bank_Account_No: driver?.Bank_Account_No || '',
    Bank_Account_Name: driver?.Bank_Account_Name || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result;
      if (mode === 'create') {
        result = await createDriver(formData as unknown as DriverFormData)
      } else if (driver?.Driver_ID) {
        result = await updateDriver(driver.Driver_ID, formData as unknown as DriverFormData)
      } else {
        throw new Error('Driver ID is missing')
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Operation failed')
      }

      toast.success(mode === 'create' ? 'เพิ่มคนขับสำเร็จ' : 'แก้ไขข้อมูลสำเร็จ')
      setShow(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl bg-slate-900/95 backdrop-blur-2xl border-white/5 text-white p-0 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-purple-500" />
        
        <DialogHeader className="p-8 pb-0">
          <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <User className="text-primary" size={24} />
              </div>
              <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter uppercase whitespace-nowrap">
                      {mode === 'create' ? 'Driver Deployment' : 'Intelligence Update'}
                  </DialogTitle>
                  <p className="text-slate-500 text-base font-bold font-black uppercase tracking-[0.3em]">System Configuration Layer</p>
              </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Section: Basic Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="Driver_ID" className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Serial ID</Label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <Input
                      id="Driver_ID"
                      value={formData.Driver_ID}
                      onChange={(e) => setFormData({ ...formData, Driver_ID: e.target.value })}
                      placeholder="e.g. DRV-001"
                      required
                      disabled={mode === 'edit'}
                      className="h-12 pl-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:ring-primary/40"
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="Driver_Name" className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Full Designation</Label>
                <Input
                  id="Driver_Name"
                  value={formData.Driver_Name}
                  onChange={(e) => setFormData({ ...formData, Driver_Name: e.target.value })}
                  placeholder="Designated Name"
                  required
                  className="h-12 px-6 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="Mobile_No" className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Comm Channel</Label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <Input
                      id="Mobile_No"
                      value={formData.Mobile_No}
                      onChange={(e) => setFormData({ ...formData, Mobile_No: e.target.value })}
                      placeholder="0XX-XXX-XXXX"
                      required
                      className="h-12 pl-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:ring-primary/40"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="Password" className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Security Key</Label>
                <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <Input
                      id="Password"
                      type="text"
                      value={formData.Password}
                      onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                      placeholder="••••••••"
                      required={mode === 'create'}
                      className="h-12 pl-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:ring-primary/40"
                    />
                </div>
              </div>
          </div>

          <div className="h-px bg-white/5 mx-[-2rem]" />

          {/* Section: Operational Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="Expire_Date" className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Licence Integrity Date</Label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <Input
                        id="Expire_Date"
                        type="date"
                        value={formData.Expire_Date}
                        onChange={(e) => setFormData({ ...formData, Expire_Date: e.target.value })}
                        className="h-12 pl-12 rounded-xl bg-white/5 border-white/10 text-white focus:ring-primary/40 invert-[0.9] dark:invert-0"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Branch HQ</Label>
                <Select value={formData.Branch_ID || undefined} onValueChange={(val) => setFormData({ ...formData, Branch_ID: val })}>
                    <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Command Center" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {Array.isArray(branches) && branches.map((b) => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Subcontractor Origin</Label>
                <Select value={formData.Sub_ID || "__independent__"} onValueChange={(val) => setFormData({ ...formData, Sub_ID: val === "__independent__" ? "" : val })}>
                    <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Independent" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="__independent__">Independent / Fleet Ops</SelectItem>
                        {Array.isArray(subcontractors) && subcontractors.map((s) => (
                            <SelectItem key={s.Sub_ID} value={s.Sub_ID}>{s.Sub_Name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-bold font-black uppercase tracking-widest text-slate-500 ml-1">Asset Allocation</Label>
                <Select value={formData.Vehicle_Plate || "__none__"} onValueChange={(val) => setFormData({ ...formData, Vehicle_Plate: val === "__none__" ? "" : val })}>
                    <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="No Vehicle" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="__none__">No Assigned Asset</SelectItem>
                        {Array.isArray(vehicles) && vehicles.map((v) => (
                            <SelectItem key={v.Vehicle_Plate} value={v.Vehicle_Plate}>{v.Vehicle_Plate}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          </div>

          {/* Section: Financial Interface */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <Landmark size={18} className="text-emerald-400" /> 
                 </div>
                 <h4 className="text-base font-bold font-black text-emerald-400 uppercase tracking-[0.3em]">Compensation Channel</h4>
            </div>
            
            <div className="space-y-2">
                <Label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Institution</Label>
                <Select value={formData.Bank_Name || "__none__"} onValueChange={(val) => setFormData({ ...formData, Bank_Name: val === "__none__" ? "" : val })}>
                    <SelectTrigger className="h-12 border-white/10 bg-black/20 text-white">
                        <SelectValue placeholder="Select Institution" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="__none__">Unspecified</SelectItem>
                        {BANKS.map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Account Serial</Label>
                    <Input
                        value={formData.Bank_Account_No}
                        onChange={(e) => setFormData({ ...formData, Bank_Account_No: e.target.value })}
                        placeholder="000-0-00000-0"
                        className="h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-800"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-base font-bold font-black text-slate-500 uppercase tracking-widest">Legal Account Name</Label>
                    <Input
                        value={formData.Bank_Account_Name}
                        onChange={(e) => setFormData({ ...formData, Bank_Account_Name: e.target.value })}
                        placeholder="Verified Full Name"
                        className="h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-800"
                    />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShow(false)}
                className="h-14 px-8 rounded-2xl text-slate-500 font-black uppercase tracking-widest text-base font-bold hover:text-white"
            >
              Abort
            </Button>
            <Button 
                type="submit" 
                disabled={loading} 
                className="h-14 px-12 rounded-2xl bg-primary hover:brightness-110 text-white font-black uppercase tracking-widest text-base font-bold shadow-xl shadow-primary/20 gap-3"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
              {mode === 'create' ? 'EXECUTE REGISTRATION' : 'SYNCHRONIZE DATA'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

