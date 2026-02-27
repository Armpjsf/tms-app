"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Navigation,
  Globe,
  FileSpreadsheet,
  Link,
  Ruler,
  Building2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  getAllRoutes, 
  createRoute, 
  updateRoute, 
  deleteRoute, 
  createBulkRoutes,
  getUniqueLocations,
  Route,
} from "@/lib/supabase/routes"
import { ExcelImport } from "@/components/ui/excel-import"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { useBranch } from "@/components/providers/branch-provider"

export default function RoutesPage() {
  const { selectedBranch, branches, isAdmin } = useBranch()
  
  const [routes, setRoutes] = useState<Route[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Route>>({
    Route_Name: "",
    Origin: "",
    Map_Link_Origin: "",
    Destination: "",
    Map_Link_Destination: "",
    Distance_KM: null,
    Branch_ID: ""
  })

  // Re-fetch when branch changes globally
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [routesData, locationsData] = await Promise.all([
      getAllRoutes(1, 100, searchQuery, selectedBranch),
      getUniqueLocations()
    ])
    
    setRoutes(routesData.data)
    setLocations(locationsData)
    setLoading(false)
  }, [searchQuery, selectedBranch]) 

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedBranch, fetchData])

  const updateForm = (field: keyof Route, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
        Route_Name: "",
        Origin: "",
        Map_Link_Origin: "",
        Destination: "",
        Map_Link_Destination: "",
        Distance_KM: null,
        // Auto-select branch if strictly one is selected
        Branch_ID: (selectedBranch && selectedBranch !== "All") ? selectedBranch : ""
    })
    setEditingRoute(null)
  }

  const handleOpenDialog = (route?: Route) => {
    if (route) {
      setEditingRoute(route)
      setFormData(route)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.Route_Name) {
      alert("กรุณาระบุชื่อเส้นทาง")
      return
    }

    setSaving(true)
    try {
      if (editingRoute) {
        // Update
        const result = await updateRoute(editingRoute.Route_Name, formData)
        if (!result.success) throw result.error
      } else {
        // Create
        const result = await createRoute(formData)
        if (!result.success) throw result.error
      }
      
      setIsDialogOpen(false)
      resetForm()
      fetchData()
    } catch (e) {
      console.error(e)
      alert("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (routeName: string) => {
    if (confirm(`ยืนยันลบเส้นทาง "${routeName}"?`)) {
      await deleteRoute(routeName)
      fetchData()
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-slate-900/40 p-6 lg:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none scale-150">
              <Navigation size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 bg-blue-500/20 rounded-2xl shadow-lg shadow-blue-500/20">
                  <Navigation className="text-blue-400 w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                    จัดการเส้นทาง (Routes)
                  </h1>
                  <p className="text-muted-foreground font-medium mt-1">กำหนดจุดรับ-ส่งสินค้า GPS และระยะทาง</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
                <ExcelImport 
                    trigger={
                        <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all">
                            <FileSpreadsheet size={16} className="mr-2" /> 
                            นำเข้า Excel
                        </Button>
                    }
                    title="นำเข้าเส้นทาง"
                    onImport={createBulkRoutes}
                    templateData={[
                        { Route_Name: "เส้นทาง A", Origin: "จุด A", Destination: "จุด B", Distance_KM: "10.5", Map_Link_Origin: "https://...", Map_Link_Destination: "https://...", Branch_ID: "HQ" }
                    ]}
                    templateFilename="template_routes.xlsx"
                />
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20">
                <Plus className="w-4 h-4 mr-2" /> เพิ่มเส้นทาง
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
                <DialogHeader>
                <DialogTitle className="text-white">
                    {editingRoute ? "แก้ไขเส้นทาง" : "เพิ่มเส้นทางใหม่"}
                </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                <div className="space-y-2">
                    <Label className="text-slate-400">ชื่อเส้นทาง * (ไม่สามารถซ้ำได้)</Label>
                    <Input
                    value={formData.Route_Name || ""}
                    onChange={(e) => updateForm("Route_Name", e.target.value)}
                    placeholder="เช่น เส้นทาง A, คลังสินค้า B"
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={!!editingRoute} // Disable renaming if it is PK
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> สาขา (Branch)
                    </Label>
                    <Select 
                        value={formData.Branch_ID || ""} 
                        onValueChange={(value) => updateForm("Branch_ID", value)}
                    >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="เลือกสาขา" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {branches.map(b => (
                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                            {b.Branch_Name} ({b.Branch_ID})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label className="text-slate-400">ต้นทาง</Label>
                    <LocationAutocomplete
                        value={formData.Origin || ""}
                        onChange={(val) => updateForm("Origin", val)}
                        locations={locations}
                        placeholder="ระบุต้นทาง"
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-slate-400">ลิ้งค์แผนที่ต้นทาง</Label>
                    <Input
                        value={formData.Map_Link_Origin || ""}
                        onChange={(e) => updateForm("Map_Link_Origin", e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label className="text-slate-400">ปลายทาง</Label>
                    <LocationAutocomplete
                        value={formData.Destination || ""}
                        onChange={(val) => updateForm("Destination", val)}
                        locations={locations}
                        placeholder="ระบุปลายทาง"
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-slate-400">ลิ้งค์แผนที่ปลายทาง</Label>
                    <Input
                        value={formData.Map_Link_Destination || ""}
                        onChange={(e) => updateForm("Map_Link_Destination", e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-400 flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> ระยะทาง (กม.)
                    </Label>
                    <Input
                        type="number"
                        value={formData.Distance_KM || ""}
                        onChange={(e) => updateForm("Distance_KM", parseFloat(e.target.value))}
                        placeholder="0.0"
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    บันทึก
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-slate-700">
                    <X className="w-4 h-4 mr-2" /> ยกเลิก
                    </Button>
                </div>
                </div>
            </DialogContent>
            </Dialog>
        </div>
        </div>

        {/* Filters Row */}
        <div className="flex gap-4 items-center">
            
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อเส้นทาง..."
                    className="pl-10 bg-slate-900/60 border-slate-800 text-white h-11 rounded-xl"
                />
            </div>
        </div>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div className="text-slate-400 text-center py-12 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" /> กำลังโหลดข้อมูล...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route) => (
            <Card key={route.Route_Name} className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm hover:border-blue-500/30 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{route.Route_Name}</h3>
                      {route.Distance_KM !== null && (
                         <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Ruler className="w-3 h-3" /> {route.Distance_KM} กม.
                         </div>
                      )}
                      {route.Branch_ID && (
                         <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <Building2 className="w-3 h-3" /> {branches.find(b => b.Branch_ID === route.Branch_ID)?.Branch_Name || route.Branch_ID}
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                    {(route.Origin || route.Destination) && (
                        <div className="flex flex-col gap-2 text-slate-300 bg-slate-950/50 p-3 rounded">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs text-slate-400">ต้นทาง:</span>
                                </div>
                                <div className="pl-4 flex items-center gap-2 justify-between">
                                    <span>{route.Origin || "-"}</span>
                                    {route.Map_Link_Origin && (
                                        <a href={route.Map_Link_Origin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                            <Globe size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-800/50 my-1"></div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-xs text-slate-400">ปลายทาง:</span>
                                </div>
                                <div className="pl-4 flex items-center gap-2 justify-between">
                                    <span>{route.Destination || "-"}</span>
                                    {route.Map_Link_Destination && (
                                        <a href={route.Map_Link_Destination} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                            <Globe size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-slate-700"
                    onClick={() => handleOpenDialog(route)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> แก้ไข
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-slate-700 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(route.Route_Name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {routes.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">ไม่พบข้อมูลเส้นทาง</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
