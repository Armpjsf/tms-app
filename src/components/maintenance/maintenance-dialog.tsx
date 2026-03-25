"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createRepairTicket, updateRepairTicket } from "@/app/maintenance/actions"
import { Loader2 } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import Logger from "@/lib/utils/logger"
import { useLanguage } from "@/components/providers/language-provider"

import { Driver } from "@/lib/supabase/drivers"

export interface MaintenanceTicket {
  Ticket_ID: string
  Date_Report: string
  Driver_ID: string
  Vehicle_Plate: string
  Issue_Type: string
  Description: string
  Priority: string
  Photo_Url: string
  Status: string
  Cost_Total: number
  Remark: string
}

type MaintenanceDialogProps = {
  drivers: Driver[]
  vehicles: { Vehicle_Plate: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialData?: MaintenanceTicket
}

export function MaintenanceDialog({
  drivers,
  vehicles,
  trigger,
  open,
  onOpenChange,
  initialData
}: MaintenanceDialogProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    Date_Report: new Date().toISOString().slice(0, 16),
    Driver_ID: '',
    Vehicle_Plate: '',
    Issue_Type: 'Engine',
    Description: '',
    Priority: 'Medium',
    Photo_Url: '',
    Status: 'Pending',
    Cost_Total: 0,
    Remark: ''
  })

  useEffect(() => {
    if (initialData) {
      let photoUrl = initialData.Photo_Url || '';
      try {
        if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
            const parsed = JSON.parse(photoUrl);
            if (Array.isArray(parsed) && parsed.length > 0) {
                photoUrl = parsed[0]
            }
        }
      } catch {
        // Error parsing photo JSON, falling back to raw string
      }

      setFormData({
        Date_Report: initialData.Date_Report ? new Date(initialData.Date_Report).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        Driver_ID: initialData.Driver_ID || '',
        Vehicle_Plate: initialData.Vehicle_Plate || '',
        Issue_Type: initialData.Issue_Type || 'Engine',
        Description: initialData.Description || '',
        Priority: initialData.Priority || 'Medium',
        Photo_Url: photoUrl,
        Status: initialData.Status || 'Pending',
        Cost_Total: initialData.Cost_Total || 0,
        Remark: initialData.Remark || ''
      })
    }
  }, [initialData, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        Date_Report: new Date(formData.Date_Report).toISOString()
      }

      if (initialData) {
        await updateRepairTicket(initialData.Ticket_ID, payload)
      } else {
        await createRepairTicket(payload)
      }
      
      setShow(false)
      if (!isControlled && !initialData) {
        setFormData({
            Date_Report: new Date().toISOString().slice(0, 16),
            Driver_ID: '',
            Vehicle_Plate: '',
            Issue_Type: 'Engine',
            Description: '',
            Priority: 'Medium',
            Photo_Url: '',
            Status: 'Pending',
            Cost_Total: 0,
            Remark: ''
        })
      }
      router.refresh()
    } catch (err) {
      Logger.error("Maintenance submit error:", err)
      // toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px] bg-white/95 border-gray-200 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? t('maintenance.title_edit') : t('maintenance.title_add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="flex justify-center mb-4">
             <ImageUpload 
                value={formData.Photo_Url} 
                onChange={(url) => setFormData({ ...formData, Photo_Url: url })}
             />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Date_Report">{t('maintenance.date_report')}</Label>
            <Input
              id="Date_Report"
              type="datetime-local"
              value={formData.Date_Report}
              onChange={(e) => setFormData({ ...formData, Date_Report: e.target.value })}
              required
              className="bg-white/5 border-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Driver_ID">{t('maintenance.reporter')}</Label>
                <Select value={formData.Driver_ID || undefined} onValueChange={(val) => setFormData({ ...formData, Driver_ID: val })}>
                    <SelectTrigger className="w-full h-10 border-gray-200 bg-white/5 text-white">
                        <SelectValue placeholder={t('maintenance.placeholder_driver')} />
                    </SelectTrigger>
                    <SelectContent>
                        {drivers.map((d: Driver) => (
                            <SelectItem key={d.Driver_ID} value={d.Driver_ID}>{d.Driver_Name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="Vehicle_Plate">{t('maintenance.vehicle')}</Label>
                <Select value={formData.Vehicle_Plate || undefined} onValueChange={(val) => setFormData({ ...formData, Vehicle_Plate: val })}>
                    <SelectTrigger className="w-full h-10 border-gray-200 bg-white/5 text-white">
                        <SelectValue placeholder={t('maintenance.placeholder_vehicle')} />
                    </SelectTrigger>
                    <SelectContent>
                        {vehicles.map((v: { Vehicle_Plate: string }) => (
                            <SelectItem key={v.Vehicle_Plate} value={v.Vehicle_Plate}>{v.Vehicle_Plate}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="Issue_Type">{t('maintenance.issue_type')}</Label>
                <Select value={formData.Issue_Type} onValueChange={(val) => setFormData({ ...formData, Issue_Type: val })}>
                    <SelectTrigger className="w-full h-10 border-gray-200 bg-white/5 text-white">
                        <SelectValue placeholder={t('maintenance.placeholder_issue')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Engine">{t('maintenance.engine')}</SelectItem>
                        <SelectItem value="Tire">{t('maintenance.tire')}</SelectItem>
                        <SelectItem value="Battery">{t('maintenance.battery')}</SelectItem>
                        <SelectItem value="Body">{t('maintenance.body')}</SelectItem>
                        <SelectItem value="Other">{t('maintenance.other')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="Priority">{t('maintenance.priority')}</Label>
                <Select value={formData.Priority} onValueChange={(val) => setFormData({ ...formData, Priority: val })}>
                    <SelectTrigger className="w-full h-10 border-gray-200 bg-white/5 text-white">
                        <SelectValue placeholder={t('maintenance.placeholder_priority')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Low">{t('maintenance.low')}</SelectItem>
                        <SelectItem value="Medium">{t('maintenance.medium')}</SelectItem>
                        <SelectItem value="High">{t('maintenance.high')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="Description">{t('maintenance.description')}</Label>
            <Textarea
              id="Description"
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder={t('maintenance.placeholder_description')}
              required
              className="bg-white/5 border-gray-200"
            />
          </div>

          {initialData && (
             <div className="pt-4 border-t border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="Status">{t('maintenance.status')}</Label>
                        <Select value={formData.Status} onValueChange={(val) => setFormData({ ...formData, Status: val })}>
                            <SelectTrigger className="w-full h-10 border-gray-200 bg-white/5 text-white">
                                <SelectValue placeholder={t('maintenance.placeholder_status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">{t('maintenance.pending')}</SelectItem>
                                <SelectItem value="In Progress">{t('maintenance.in_progress')}</SelectItem>
                                <SelectItem value="Completed">{t('maintenance.completed')}</SelectItem>
                                <SelectItem value="Cancelled">{t('maintenance.cancelled')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Cost_Total">{t('maintenance.cost')}</Label>
                         <Input
                            id="Cost_Total"
                            type="number"
                            value={formData.Cost_Total}
                            onChange={(e) => setFormData({ ...formData, Cost_Total: parseFloat(e.target.value) || 0 })}
                            className="bg-white/5 border-gray-200"
                         />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="Remark">{t('maintenance.remark')}</Label>
                    <Textarea
                        id="Remark"
                        value={formData.Remark}
                        onChange={(e) => setFormData({ ...formData, Remark: e.target.value })}
                        placeholder={t('maintenance.placeholder_remark')}
                        className="bg-white/5 border-gray-200"
                    />
                </div>
             </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShow(false)}>
              {t('jobs.dialog.abort')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? t('common.save') : t('maintenance.title_report_btn') || 'แจ้งซ่อม'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
