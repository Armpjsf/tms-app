"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
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
  Ruler,
  Building2,
  Activity,
  Zap,
  ShieldCheck,
  Target
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function RoutesPage() {
  const { selectedBranch, branches } = useBranch()
  
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
    Origin_Lat: null,
    Origin_Lon: null,
    Map_Link_Origin: "",
    Destination: "",
    Dest_Lat: null,
    Dest_Lon: null,
    Map_Link_Destination: "",
    Distance_KM: null,
    Branch_ID: ""
  })

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

  const updateForm = (field: keyof Route, data: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: data }))
  }

  const resetForm = () => {
    setFormData({
        Route_Name: "",
        Origin: "",
        Origin_Lat: null,
        Origin_Lon: null,
        Map_Link_Origin: "",
        Destination: "",
        Dest_Lat: null,
        Dest_Lon: null,
        Map_Link_Destination: "",
        Distance_KM: null,
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
      toast.warning("กรุณาระบุชื่อเส้นทาง")
      return
    }

    setSaving(true)
    try {
      if (editingRoute) {
        const result = await updateRoute(editingRoute.Route_Name, formData)
        if (!result.success) throw result.error
      } else {
        const result = await createRoute(formData)
        if (!result.success) throw result.error
      }
      
      setIsDialogOpen(false)
      resetForm()
      fetchData()
      toast.success("บันทึกข้อมูลเส้นทางเรียบร้อยแล้ว")
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (routeName: string) => {
    if (confirm(`ยืนยันลบเส้นทาง "${routeName}"?`)) {
      await deleteRoute(routeName)
      fetchData()
      toast.success("ลบข้อมูลเส้นทางเรียบร้อยแล้ว")
    }
  }

  return (
    <DashboardLayout>
      {/* Tactical Route Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <Navigation className="text-primary" size={20} />
                </div>
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Geospatial Intelligence Matrix</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                Logistics Routes
            </h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">
              Tactical Route Optimization & Mapping Command Centre
            </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                        <FileSpreadsheet size={20} className="mr-3 opacity-50" /> 
                        Spatial Import
                    </PremiumButton>
                }
                title="Route Vector Import"
                onImport={createBulkRoutes}
                templateFilename="logispro_routes_template.xlsx"
            />
            <PremiumButton onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl shadow-xl shadow-primary/20">
              <Plus size={24} className="mr-3" strokeWidth={3} />
              ENLIST ROUTE
            </PremiumButton>
        </div>
      </div>

      {/* Navigation Command Grid */}
      <div className="mb-12 relative group max-w-2xl">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary blur-3xl opacity-20 pointer-events-none" />
        <div className="relative glass-panel rounded-3xl p-1 border-white/5">
            <div className="flex items-center gap-4 px-6">
                <Search className="text-primary opacity-50" size={24} />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SCAN ROUTE VECTORS & NODES..."
                    className="bg-transparent border-none text-2xl font-black text-white px-4 h-20 placeholder:text-slate-700 tracking-tighter uppercase focus-visible:ring-0"
                />
            </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#0a0518] border border-white/5 text-white max-w-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10">
            <div className="bg-[#0c061d] p-12 text-white relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <DialogHeader>
                  <DialogTitle className="text-5xl font-black tracking-tighter flex items-center gap-6 uppercase premium-text-gradient">
                    <div className="p-3 bg-primary/20 rounded-2xl shadow-xl ring-1 ring-primary/30">
                        <Target size={32} className="text-primary" strokeWidth={2.5} />
                    </div>
                    {editingRoute ? "Refine Vector" : "Plot New Route"}
                  </DialogTitle>
                </DialogHeader>
            </div>

            <div className="p-12 space-y-10 custom-scrollbar max-h-[70vh] overflow-y-auto">
              {/* Route Primary Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-2">Mission Route Name</Label>
                  <Input
                    value={formData.Route_Name || ""}
                    onChange={(e) => updateForm("Route_Name", e.target.value)}
                    placeholder="E.G. SECTOR-A, GRID-X"
                    className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl px-8 text-sm uppercase tracking-widest focus:bg-white/10 transition-all"
                    disabled={!!editingRoute}
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-2">Command Center / Branch</Label>
                  <Select 
                      value={formData.Branch_ID || ""} 
                      onValueChange={(value) => updateForm("Branch_ID", value)}
                  >
                      <SelectTrigger className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl px-8 text-sm uppercase tracking-widest">
                        <SelectValue placeholder="SELECT SECTOR" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c061d] border-white/10 text-white font-black">
                      {branches.map(b => (
                          <SelectItem key={b.Branch_ID} value={b.Branch_ID} className="hover:bg-primary/20 focus:bg-primary/20 uppercase tracking-widest text-[10px]">
                          {b.Branch_Name} ({b.Branch_ID})
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Origin Tactical Block */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-primary tracking-[0.3em] uppercase flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,30,133,1)]" />
                    Origin Logistics Node
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Node Alias</Label>
                        <LocationAutocomplete
                            value={formData.Origin || ""}
                            onChange={(val) => updateForm("Origin", val)}
                            locations={locations}
                            placeholder="ENLIST ORIGIN NODAL POINT..."
                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-8 text-xs font-black uppercase tracking-widest text-white placeholder:text-slate-800"
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">GEO Vector Link</Label>
                        <Input
                            value={formData.Map_Link_Origin || ""}
                            onChange={(e) => updateForm("Map_Link_Origin", e.target.value)}
                            placeholder="HTTPS://MAPS.GOOGLE.COM/..."
                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-8 text-xs font-black text-white focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-10 p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                    <div className="space-y-3">
                        <Label className="text-[8px] font-black text-primary uppercase tracking-[0.4em] ml-2">Lat-X Matrix</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.Origin_Lat ?? ""}
                            onChange={(e) => updateForm("Origin_Lat", e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="13.XXXX"
                            className="bg-transparent border-white/10 text-white font-black text-center text-sm tracking-widest h-12"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[8px] font-black text-primary uppercase tracking-[0.4em] ml-2">Lon-Y Matrix</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.Origin_Lon ?? ""}
                            onChange={(e) => updateForm("Origin_Lon", e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="100.XXXX"
                            className="bg-transparent border-white/10 text-white font-black text-center text-sm tracking-widest h-12"
                        />
                    </div>
                </div>
              </div>

              {/* Destination Tactical Block */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-accent tracking-[0.3em] uppercase flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(168,85,247,1)]" />
                    Destination Logistics Node
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Terminus Alias</Label>
                        <LocationAutocomplete
                            value={formData.Destination || ""}
                            onChange={(val) => updateForm("Destination", val)}
                            locations={locations}
                            placeholder="ENLIST DESTINATION TERMINUS..."
                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-8 text-xs font-black uppercase tracking-widest text-white placeholder:text-slate-800"
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">GEO Terminus Link</Label>
                        <Input
                            value={formData.Map_Link_Destination || ""}
                            onChange={(e) => updateForm("Map_Link_Destination", e.target.value)}
                            placeholder="HTTPS://MAPS.GOOGLE.COM/..."
                            className="h-16 bg-white/5 border-white/5 rounded-2xl px-8 text-xs font-black text-white focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-10 p-8 bg-accent/5 rounded-[2.5rem] border border-accent/10">
                    <div className="space-y-3">
                        <Label className="text-[8px] font-black text-accent uppercase tracking-[0.4em] ml-2">Lat-X Matrix</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.Dest_Lat ?? ""}
                            onChange={(e) => updateForm("Dest_Lat", e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="13.XXXX"
                            className="bg-transparent border-white/10 text-white font-black text-center text-sm tracking-widest h-12"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[8px] font-black text-accent uppercase tracking-[0.4em] ml-2">Lon-Y Matrix</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.Dest_Lon ?? ""}
                            onChange={(e) => updateForm("Dest_Lon", e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="100.XXXX"
                            className="bg-transparent border-white/10 text-white font-black text-center text-sm tracking-widest h-12"
                        />
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-2">Nodal Distance Delta (KM)</Label>
                  <div className="glass-panel p-1 rounded-2xl border-white/5">
                    <Input
                        type="number"
                        value={formData.Distance_KM || ""}
                        onChange={(e) => updateForm("Distance_KM", parseFloat(e.target.value))}
                        placeholder="0.0"
                        className="bg-transparent border-none text-2xl font-black text-white text-center h-16 tracking-widest"
                    />
                  </div>
              </div>

              <div className="flex gap-6 pt-10 border-t border-white/5 mt-12 mb-8">
                <PremiumButton onClick={handleSave} disabled={saving} className="flex-[2] bg-primary hover:bg-primary/80 shadow-primary/20 h-20 rounded-3xl text-lg font-black tracking-widest uppercase">
                  {saving ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Save className="w-6 h-6 mr-4" strokeWidth={3} />}
                  EXECUTE PLOT
                </PremiumButton>
                <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-white/5 h-20 rounded-3xl text-slate-500 hover:text-white hover:bg-white/5 transition-all uppercase font-black tracking-widest">
                  Abort
                </PremiumButton>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {/* Routes Intelligence Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[4rem] border-white/5 group">
             <div className="relative">
                <Loader2 className="animate-spin text-primary opacity-40" size={80} strokeWidth={1} />
                <Navigation className="absolute inset-0 m-auto text-primary animate-pulse" size={32} />
             </div>
             <p className="mt-10 text-slate-700 font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">Scanning Spatial Fabric...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {routes.map((route) => (
            <div key={route.Route_Name} className="p-0 overflow-hidden group border border-white/5 bg-[#0a0518]/40 backdrop-blur-2xl rounded-[3.5rem] shadow-2xl relative hover:shadow-[0_45px_100px_-20px_rgba(255,30,133,0.1)] transition-all duration-700 hover:ring-1 hover:ring-primary/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="p-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-white font-bold group-hover:bg-primary transition-all duration-700 relative overflow-hidden shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                      <MapPin size={28} className="relative z-10" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-primary transition-colors line-clamp-1 duration-500 uppercase font-display">{route.Route_Name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                          <span className="text-slate-500 font-black text-[9px] uppercase tracking-[0.4em] italic">{route.Branch_ID || "HQ-CENTER"}</span>
                          {route.Distance_KM !== null && (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                <div className="flex items-center gap-2">
                                    <Ruler size={10} className="text-primary/60" />
                                    <span className="text-primary font-black text-[10px] uppercase tracking-widest">{route.Distance_KM} KM</span>
                                </div>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spatial Vector Visualization */}
                <div className="space-y-6 relative mb-8">
                    <div className="absolute left-[7px] top-4 bottom-4 w-px bg-gradient-to-b from-primary via-white/10 to-accent opacity-40" />
                    
                    <div className="flex flex-col gap-1 pl-8 relative">
                        <div className="absolute left-[-2px] top-1 w-5 h-5 bg-[#0a0518] border border-primary/40 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Inception Point</span>
                            {route.Map_Link_Origin && (
                                <a href={route.Map_Link_Origin} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 rounded-lg text-primary hover:bg-primary hover:text-white transition-all">
                                    <Globe size={12} />
                                </a>
                            )}
                        </div>
                        <p className="text-sm font-black text-slate-300 uppercase tracking-tight">{route.Origin || "GLOBAL GRID-START"}</p>
                    </div>

                    <div className="flex flex-col gap-1 pl-8 relative">
                        <div className="absolute left-[-2px] top-1 w-5 h-5 bg-[#0a0518] border border-accent/40 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Terminus Point</span>
                            {route.Map_Link_Destination && (
                                <a href={route.Map_Link_Destination} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 rounded-lg text-accent hover:bg-accent hover:text-white transition-all">
                                    <Globe size={12} />
                                </a>
                            )}
                        </div>
                        <p className="text-sm font-black text-slate-300 uppercase tracking-tight">{route.Destination || "GLOBAL GRID-END"}</p>
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/5">
                  <button 
                    className="flex-1 h-14 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center gap-3"
                    onClick={() => handleOpenDialog(route)}
                  >
                    <Edit size={16} /> Refine Plot
                  </button>
                  <button 
                    className="h-14 w-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-rose-800 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                    onClick={() => handleDelete(route.Route_Name)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Enhanced Empty State */}
          {routes.length === 0 && (
            <div className="col-span-full text-center py-40 glass-panel rounded-[4rem] border-dashed border-white/5 group">
              <Activity className="w-20 h-20 text-slate-800 mx-auto mb-8 opacity-20 group-hover:scale-110 transition-transform duration-1000" />
              <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-[10px]">Registry Empty • No Route Vectors Detected</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-[9px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <ShieldCheck size={14} className="text-primary" /> GIS Neural Grid Core v6.0 • Tactical Nodal Routing
        </div>
      </div>
    </DashboardLayout>
  )
}
