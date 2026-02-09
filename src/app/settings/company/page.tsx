"use client"

import { useState, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Building,
  Upload,
  Save,
  Phone,
  Mail,
  MapPin,
  FileText,
  Globe,
  CreditCard,
  ImageIcon,
  Loader2
} from "lucide-react"

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    company_name: "",
    company_name_en: "",
    tax_id: "",
    branch: "สำนักงานใหญ่",
    address: "",
    phone: "",
    fax: "",
    email: "",
    website: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_no: "",
    logo_url: ""
  })

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Save to Supabase System_Config table
      await new Promise(r => setTimeout(r, 1000))
      alert("บันทึกข้อมูลสำเร็จ!")
    } catch (e) {
      console.error(e)
      alert("เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building className="text-blue-400" />
            ข้อมูลบริษัท
          </h1>
          <p className="text-sm text-slate-400 mt-1">ตั้งค่าข้อมูลบริษัทสำหรับใช้ในเอกสาร</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึก
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              โลโก้บริษัท
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div 
              className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-slate-800/50 overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <Upload className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">คลิกเพื่ออัปโหลด</p>
                  <p className="text-xs text-slate-500">PNG, JPG (สูงสุด 2MB)</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-4">
              แนะนำ: ใช้ภาพขนาด 400x400 พิกเซล พื้นหลังโปร่งใส
            </p>
            {logoPreview && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 border-slate-700"
                onClick={() => setLogoPreview(null)}
              >
                ลบโลโก้
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              ข้อมูลทั่วไป
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">ชื่อบริษัท (ไทย) *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => updateForm("company_name", e.target.value)}
                  placeholder="บริษัท ขนส่งดี จำกัด"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">ชื่อบริษัท (อังกฤษ)</Label>
                <Input
                  value={formData.company_name_en}
                  onChange={(e) => updateForm("company_name_en", e.target.value)}
                  placeholder="Good Transport Co., Ltd."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> เลขประจำตัวผู้เสียภาษี
                </Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => updateForm("tax_id", e.target.value)}
                  placeholder="0123456789012"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">สาขา</Label>
                <Input
                  value={formData.branch}
                  onChange={(e) => updateForm("branch", e.target.value)}
                  placeholder="สำนักงานใหญ่"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> ที่อยู่
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) => updateForm("address", e.target.value)}
                placeholder="123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110"
                className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> โทรศัพท์
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="02-XXX-XXXX"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">แฟกซ์</Label>
                <Input
                  value={formData.fax}
                  onChange={(e) => updateForm("fax", e.target.value)}
                  placeholder="02-XXX-XXXX"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> อีเมล
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="info@company.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400 flex items-center gap-1">
                <Globe className="w-3 h-3" /> เว็บไซต์
              </Label>
              <Input
                value={formData.website}
                onChange={(e) => updateForm("website", e.target.value)}
                placeholder="https://www.company.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Info */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              ข้อมูลบัญชีธนาคาร (สำหรับใบเสร็จ/ใบแจ้งหนี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">ธนาคาร</Label>
                <select
                  value={formData.bank_name}
                  onChange={(e) => updateForm("bank_name", e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="">เลือกธนาคาร</option>
                  <option value="กรุงเทพ">ธนาคารกรุงเทพ</option>
                  <option value="กสิกรไทย">ธนาคารกสิกรไทย</option>
                  <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                  <option value="กรุงไทย">ธนาคารกรุงไทย</option>
                  <option value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
                  <option value="กรุงศรี">ธนาคารกรุงศรีอยุธยา</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">ชื่อบัญชี</Label>
                <Input
                  value={formData.bank_account_name}
                  onChange={(e) => updateForm("bank_account_name", e.target.value)}
                  placeholder="บริษัท ขนส่งดี จำกัด"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">เลขที่บัญชี</Label>
                <Input
                  value={formData.bank_account_no}
                  onChange={(e) => updateForm("bank_account_no", e.target.value)}
                  placeholder="XXX-X-XXXXX-X"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
