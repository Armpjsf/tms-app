"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createJob, getJobCreationData } from "@/app/planning/actions"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Route } from "@/lib/supabase/routes"
import { Customer } from "@/lib/supabase/customers"
import { 
  ArrowLeft, 
  Package,
  User,
  MapPin,
  Truck,
  Calendar,
  Clock,
  Building2,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Eye,
  Navigation,
  Zap,
  Target,
  ShieldCheck,
  Cpu,
  Activity,
  ChevronLeft,
  Sparkles
} from "lucide-react"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { AiSuggestionCard } from "@/components/planning/ai-suggestion-card"
import { DriverSuggestion } from "@/lib/ai/ai-assign"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { cn } from "@/lib/utils"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { motion, AnimatePresence } from "framer-motion"

// Step indicator component with LogisPro aesthetics
function StepIndicator({ steps, currentStep }: { steps: string[], currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-12 px-6 lg:px-12">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-3 relative z-10 group">
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-500 border-2",
                index < currentStep 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                    : index === currentStep 
                    ? 'bg-primary/20 text-primary border-primary shadow-[0_0_30px_rgba(255,30,133,0.4)] scale-110' 
                    : 'bg-muted/50 text-muted-foreground border-border/5'
            )}>
              {index < currentStep ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
            </div>
            <span className={cn(
                "text-base font-bold uppercase font-black tracking-[0.2em] italic hidden md:block transition-colors duration-500",
                index <= currentStep ? 'text-white' : 'text-muted-foreground'
            )}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 mx-4 relative h-0.5 overflow-hidden rounded-full bg-muted/50">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: index < currentStep ? '100%' : '0%' }}
                    className="absolute inset-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"
                    transition={{ duration: 0.8 }}
                />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateJobPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Real data lists
  const [lists, setLists] = useState<{
    drivers: Driver[],
    vehicles: Vehicle[],
    customers: Customer[],
    routes: Route[]
  }>({ drivers: [], vehicles: [], customers: [], routes: [] })

  useEffect(() => {
    getJobCreationData().then(data => {
        setLists(data)
    })
  }, [])

  const steps = ['Mission Parameters', 'Node Selection', 'Personnel Assignment', 'Sync Confirmation']
  
  const [formData, setFormData] = useState({
    Job_ID: `JB-${Date.now().toString().slice(-6)}`,
    Plan_Date: new Date().toISOString().split('T')[0],
    Plan_Time: '09:00',
    Priority: 'Normal',
    Customer_Name: '',
    Customer_Phone: '',
    Customer_Address: '',
    Origin_Location: '',
    Dest_Location: '',
    Route_Name: '',
    Driver_ID: '',
    Driver_Name: '',
    Vehicle_Plate: '',
    Notes: '',
    Cargo_Type: '',
    Weight: '',
    Price_Cust_Total: '0',
    Cost_Driver_Total: '0',
    Show_Price_To_Driver: true,
    Pickup_Lat: null as number | null,
    Pickup_Lon: null as number | null,
    Delivery_Lat: null as number | null,
    Delivery_Lon: null as number | null,
    Est_Distance_KM: 0
  })

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      Customer_Name: customer.Customer_Name,
      Customer_Phone: customer.Phone || customer.Customer_Phone || '',
      Customer_Address: customer.Address || customer.Customer_Address || '',
    }))
  }

  const handleRouteSelect = (routeName: string) => {
    const route = lists.routes.find(r => r.Route_Name === routeName)
    if (route) {
      setFormData(prev => ({
        ...prev,
        Route_Name: route.Route_Name,
        Origin_Location: route.Origin || '',
        Dest_Location: route.Destination || '',
        Pickup_Lat: route.Origin_Lat,
        Pickup_Lon: route.Origin_Lon,
        Delivery_Lat: route.Dest_Lat,
        Delivery_Lon: route.Dest_Lon,
        Est_Distance_KM: route.Distance_KM || 0,
      }))
    }
  }

  const handleDriverChange = (driverId: string) => {
    const driver = lists.drivers.find(d => d.Driver_ID === driverId)
    updateForm('Driver_ID', driverId)
    if (driver) {
      updateForm('Driver_Name', driver.Driver_Name || '')
      if (driver.Vehicle_Plate && !formData.Vehicle_Plate) {
        updateForm('Vehicle_Plate', driver.Vehicle_Plate)
      }
    }
  }

  const updateForm = (field: string, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await createJob({
        Job_ID: formData.Job_ID,
        Plan_Date: formData.Plan_Date,
        Customer_Name: formData.Customer_Name,
        Origin_Location: formData.Origin_Location,
        Dest_Location: formData.Dest_Location,
        Route_Name: `${formData.Origin_Location} - ${formData.Dest_Location}`, 
        Driver_ID: formData.Driver_ID,
        Driver_Name: formData.Driver_Name,
        Vehicle_Plate: formData.Vehicle_Plate,
        Cargo_Type: formData.Cargo_Type,
        Notes: formData.Notes,
        Weight_Kg: formData.Weight ? parseFloat(formData.Weight) : 0,
        Price_Cust_Total: parseFloat(formData.Price_Cust_Total) || 0,
        Cost_Driver_Total: parseFloat(formData.Cost_Driver_Total) || 0,
        Show_Price_To_Driver: formData.Show_Price_To_Driver,
        Pickup_Lat: formData.Pickup_Lat,
        Pickup_Lon: formData.Pickup_Lon,
        Delivery_Lat: formData.Delivery_Lat,
        Delivery_Lon: formData.Delivery_Lon,
        Est_Distance_KM: formData.Est_Distance_KM,
        Job_Status: 'New'
      })

      if (result.success) {
        toast.success('Mission Initialized Successfully')
        router.push('/planning')
      } else {
        toast.error('Initialization Signal Failure: ' + result.message)
      }
    } catch {
      toast.error('Critical Linkage Error')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => currentStep < steps.length - 1 && setCurrentStep(prev => prev + 1)
  const prevStep = () => currentStep > 0 && setCurrentStep(prev => prev - 1)

  return (
    <div className="min-h-screen bg-background p-4 lg:p-10 space-y-12 pb-32">
        {/* Tactical Header */}
        <div className="bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                <div className="space-y-6">
                    <Link href="/planning" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-base font-bold group/back italic">
                        <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                        HUB_PLANNING
                    </Link>
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                            <Zap size={40} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">Mission Control</h1>
                            <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic italic">Initialize New Logistical Vector // Tier-0 Ops</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 self-end lg:self-center">
                    <div className="bg-muted/50 border border-border/5 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Cpu className="text-primary" size={16} />
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">PROCESS_CORE: ONLINE</span>
                    </div>
                    <div className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic">v2.4.0-STABLE_UPLINK</div>
                </div>
            </div>
        </div>

        {/* Stepper Infrastructure */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Main Interface Module */}
        <AnimatePresence mode="wait">
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
            >
                <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden max-w-5xl mx-auto">
                    <div className="p-12 space-y-12">
                        {/* Step 1: Mission Parameters */}
                        {currentStep === 0 && (
                            <div className="space-y-10">
                                <div className="flex items-center gap-5 border-l-4 border-primary pl-8">
                                    <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-inner">
                                        <Package size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-foreground italic uppercase tracking-[0.2em]">Mission Intel</h2>
                                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mt-1 italic">Define core logistical parameters</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3 group">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 group-focus-within:text-primary transition-colors italic">Mission Identifier</Label>
                                        <Input 
                                            value={formData.Job_ID}
                                            onChange={(e) => updateForm('Job_ID', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner uppercase tracking-widest italic"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Operational Priority</Label>
                                        <Select value={formData.Priority} onValueChange={(val) => updateForm('Priority', val)}>
                                            <SelectTrigger className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner uppercase tracking-widest italic">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background border-border/10 rounded-2xl">
                                                <SelectItem value="Normal" className="text-muted-foreground focus:bg-primary/20 focus:text-primary">NORMAL_ops</SelectItem>
                                                <SelectItem value="High" className="text-amber-500 focus:bg-amber-500/20 focus:text-amber-500 font-bold">HIGH_ALERT</SelectItem>
                                                <SelectItem value="Urgent" className="text-rose-600 focus:bg-rose-600/20 focus:text-rose-600 font-black italic animate-pulse">CRITICAL_V2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                            <Calendar className="w-3 h-3" /> Temporal Date
                                        </Label>
                                        <Input 
                                            type="date"
                                            value={formData.Plan_Date}
                                            onChange={(e) => updateForm('Plan_Date', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner italic"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                            <Clock className="w-3 h-3" /> Mission Sync Time
                                        </Label>
                                        <Input 
                                            type="time"
                                            value={formData.Plan_Time}
                                            onChange={(e) => updateForm('Plan_Time', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner italic"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Cargo Classification</Label>
                                        <Input 
                                            placeholder="DRY_GOODS, FRAGILE_V3, COLD_CHAIN..."
                                            value={formData.Cargo_Type}
                                            onChange={(e) => updateForm('Cargo_Type', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner uppercase tracking-widest italic"
                                        />
                                    </div>
                                    <div className="space-y-3 text-right">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mr-4 italic text-right block">Mass Index (KG)</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.Weight}
                                            onChange={(e) => updateForm('Weight', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-3xl font-black text-primary hover:border-border/10 focus:border-primary/50 transition-all shadow-inner italic text-right font-sans"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Node Selection */}
                        {currentStep === 1 && (
                            <div className="space-y-12">
                                <div className="flex items-center gap-5 border-l-4 border-emerald-500/50 pl-8">
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                                        <User size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-foreground italic uppercase tracking-[0.2em]">External Nodes</h2>
                                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mt-1 italic">Identify target entity & transit route</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                            <Building2 className="w-3 h-3" /> Entity Registry
                                        </Label>
                                        <div className="relative group/cust">
                                            <CustomerAutocomplete 
                                                value={formData.Customer_Name}
                                                onChange={(val) => updateForm('Customer_Name', val)}
                                                customers={lists.customers}
                                                onSelect={handleCustomerSelect}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                            <Phone className="w-3 h-3" /> Secure Comms Link
                                        </Label>
                                        <Input 
                                            placeholder="+66 8X-XXX-XXXX"
                                            value={formData.Customer_Phone}
                                            onChange={(e) => updateForm('Customer_Phone', e.target.value)}
                                            className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner uppercase tracking-widest font-sans italic"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                        <MapPin className="w-3 h-3" /> Registry Address Node
                                    </Label>
                                    <Textarea 
                                        placeholder="Full geographic coordinates & physical address..."
                                        value={formData.Customer_Address}
                                        onChange={(e) => updateForm('Customer_Address', e.target.value)}
                                        className="bg-background/50 border-border/5 rounded-3xl p-8 text-xl font-black text-foreground hover:border-border/10 focus:border-primary/50 transition-all shadow-inner uppercase tracking-widest italic min-h-[120px]"
                                    />
                                </div>

                                <div className="pt-10 border-t border-border/5 space-y-10 group/master">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3 italic">
                                            <Navigation className="w-6 h-6 animate-pulse" /> Global Route Master
                                        </Label>
                                        <div className="px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-base font-bold font-black text-emerald-500 uppercase tracking-[0.4em] italic">SYNCED_GPS_CORE</div>
                                    </div>
                                    
                                    <Select value={formData.Route_Name} onValueChange={handleRouteSelect}>
                                        <SelectTrigger className="h-20 bg-emerald-500/5 border-emerald-500/20 rounded-[2.5rem] px-8 text-foreground hover:bg-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xl uppercase tracking-widest italic">
                                            <SelectValue placeholder="SCAN_ROUTE_DATABASE..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background border-emerald-500/30 rounded-3xl">
                                            {lists.routes.map(r => (
                                                <SelectItem key={r.Route_Name} value={r.Route_Name} className="text-muted-foreground focus:bg-emerald-500/20 focus:text-emerald-400 p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black italic tracking-widest">{r.Route_Name}</span>
                                                        <span className="text-base font-bold text-muted-foreground">{r.Origin} → {r.Destination}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Origin Source</Label>
                                            <Input 
                                                placeholder="START_NODE..."
                                                value={formData.Origin_Location}
                                                onChange={(e) => updateForm('Origin_Location', e.target.value)}
                                                className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground italic shadow-inner uppercase tracking-widest"
                                            />
                                            {formData.Pickup_Lat && (
                                                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-base font-bold font-black text-emerald-500 uppercase italic">
                                                    <Target className="w-3 h-3" /> LAT_LONG_SYNC: {formData.Pickup_Lat}, {formData.Pickup_Lon}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Target Destination</Label>
                                            <Input 
                                                placeholder="END_NODE..."
                                                value={formData.Dest_Location}
                                                onChange={(e) => updateForm('Dest_Location', e.target.value)}
                                                className="h-16 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground italic shadow-inner uppercase tracking-widest"
                                            />
                                            {formData.Delivery_Lat && (
                                                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-base font-bold font-black text-rose-500 uppercase italic ml-auto">
                                                    <Target className="w-3 h-3" /> DEST_VECTOR_LOCK: {formData.Delivery_Lat}, {formData.Delivery_Lon}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {formData.Est_Distance_KM > 0 && (
                                        <div className="p-10 bg-background rounded-[3rem] border border-border/5 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group/dist">
                                            <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-lg group-hover/dist:scale-110 transition-transform">
                                                    <Navigation size={28} />
                                                </div>
                                                <div>
                                                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic mb-1 block">Projected Displacement</span>
                                                    <h3 className="text-4xl font-black text-foreground italic tracking-widest uppercase">Linear Vector Metrics</h3>
                                                </div>
                                            </div>
                                            <div className="text-right relative z-10">
                                                <span className="text-base font-bold font-black text-emerald-600 uppercase tracking-widest block mb-2">GPS_DELTA: NOMINAL</span>
                                                <span className="text-6xl font-black text-emerald-500 italic drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">{formData.Est_Distance_KM} <span className="text-2xl ml-[-15px]">KM</span></span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Personnel Assignment */}
                        {currentStep === 2 && (
                            <div className="space-y-12">
                                <div className="flex items-center gap-5 border-l-4 border-primary pl-8">
                                    <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-inner">
                                        <Truck size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-foreground italic uppercase tracking-[0.2em]">Asset Matrix</h2>
                                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mt-1 italic">Deploy operator & high-fidelity asset</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-6 py-2 bg-primary px-4 py-1 bg-primary/10 rounded-full border border-primary/30 w-fit mb-4">
                                        <Sparkles size={14} className="text-primary animate-pulse" />
                                        <span className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] italic">Cognitive Optimization Engine</span>
                                    </div>
                                    <AiSuggestionCard
                                        jobData={{
                                            Pickup_Lat: formData.Pickup_Lat,
                                            Pickup_Lon: formData.Pickup_Lon,
                                            Plan_Date: formData.Plan_Date,
                                        }}
                                        onSelect={(driver: DriverSuggestion) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                Driver_ID: driver.Driver_ID,
                                                Driver_Name: driver.Driver_Name,
                                                Vehicle_Plate: driver.Vehicle_Plate,
                                            }))
                                            toast.success('Optimal Vector Assigned')
                                        }}
                                    />
                                </div>

                                <div className="relative py-10 flex flex-col items-center">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-muted/50" />
                                    <span className="relative z-10 px-8 bg-background text-base font-bold font-black text-muted-foreground uppercase tracking-[0.6em] italic">Manual Override Protocol</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3 group">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Operator Designation</Label>
                                        <Select value={formData.Driver_ID} onValueChange={handleDriverChange}>
                                            <SelectTrigger className="h-18 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 transition-all shadow-inner uppercase tracking-widest italic group-focus-within:border-primary/50">
                                                <SelectValue placeholder="SELECT_OPERATOR..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background border-border/10 rounded-3xl">
                                                {lists.drivers.map(d => (
                                                    <SelectItem key={d.Driver_ID} value={d.Driver_ID} className="p-4 focus:bg-primary/20 text-muted-foreground">
                                                        <div className="flex flex-col">
                                                            <span className="font-black italic uppercase tracking-widest">{d.Driver_Name}</span>
                                                            <span className="text-base font-bold text-muted-foreground">ID: {d.Driver_ID} // {d.Mobile_No}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3 group">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 italic">Asset Signature</Label>
                                        <Select value={formData.Vehicle_Plate} onValueChange={(val) => updateForm('Vehicle_Plate', val)}>
                                            <SelectTrigger className="h-18 bg-background/50 border-border/5 rounded-3xl px-8 text-xl font-black text-foreground hover:border-border/10 transition-all shadow-inner uppercase tracking-widest italic group-focus-within:border-primary/50">
                                                <SelectValue placeholder="SELECT_ASSET_PLATE..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background border-border/10 rounded-3xl">
                                                {lists.vehicles.map(v => (
                                                    <SelectItem key={v.vehicle_plate} value={v.vehicle_plate} className="p-4 focus:bg-primary/20 text-muted-foreground">
                                                        <div className="flex flex-col font-sans">
                                                            <span className="font-black italic tracking-widest">{v.vehicle_plate}</span>
                                                            <span className="text-base font-bold text-muted-foreground">SPEC: {v.vehicle_type} // OPTIMIZED</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3 group">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                            <FileText className="w-3 h-3 text-rose-500" /> Operator Yield (THB)
                                        </Label>
                                        <Input 
                                            type="number"
                                            value={formData.Cost_Driver_Total}
                                            onChange={(e) => updateForm('Cost_Driver_Total', e.target.value)}
                                            className="h-18 bg-background/50 border-border/5 rounded-3xl px-8 text-3xl font-black text-rose-500 hover:border-border/10 transition-all shadow-inner italic font-sans text-right"
                                        />
                                    </div>
                                    <div className="space-y-3 group text-right">
                                        <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mr-4 flex items-center gap-2 justify-end italic">
                                            <FileText className="w-3 h-3 text-emerald-500" /> Entity Ledger (THB)
                                        </Label>
                                        <Input 
                                            type="number"
                                            value={formData.Price_Cust_Total}
                                            onChange={(e) => updateForm('Price_Cust_Total', e.target.value)}
                                            className="h-18 bg-background/50 border-border/5 rounded-3xl px-8 text-3xl font-black text-emerald-500 hover:border-border/10 transition-all shadow-inner italic font-sans text-right"
                                        />
                                    </div>
                                </div>

                                <div className="p-10 rounded-[3rem] bg-muted/50 border border-border/10 flex items-center justify-between group/toggle relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-full bg-emerald-500/[0.03] blur-3xl" />
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner group-hover/toggle:scale-110 transition-all">
                                            <Eye size={32} />
                                        </div>
                                        <div>
                                            <Label className="text-xl font-black text-white italic uppercase tracking-widest cursor-pointer" htmlFor="show-price">
                                                Visual Transparency
                                            </Label>
                                            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mt-1">Reveal yield metrics to operator node</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        id="show-price"
                                        checked={formData.Show_Price_To_Driver}
                                        onCheckedChange={(val) => updateForm('Show_Price_To_Driver', val)}
                                        className="scale-125 data-[state=checked]:bg-emerald-500 relative z-10"
                                    />
                                </div>

                                <div className="space-y-3 group">
                                    <Label className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest ml-4 flex items-center gap-2 italic">
                                        <FileText className="w-3 h-3" /> Tactical Intel Briefing
                                    </Label>
                                    <Textarea 
                                        placeholder="Extra operational intel, safety protocols, routing nuances..."
                                        value={formData.Notes}
                                        onChange={(e) => updateForm('Notes', e.target.value)}
                                        className="bg-background/50 border-border/5 rounded-[3rem] p-10 text-xl font-black text-foreground hover:border-border/10 transition-all shadow-inner uppercase tracking-widest italic min-h-[150px]"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Confirmation */}
                        {currentStep === 3 && (
                            <div className="space-y-12">
                                <div className="flex items-center gap-5 border-l-4 border-amber-500/50 pl-8">
                                    <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 shadow-inner">
                                        <CheckCircle2 size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-foreground italic uppercase tracking-[0.2em]">Sync Registry</h2>
                                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mt-1 italic">Review & broadcast mission state</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <PremiumCard className="p-10 bg-muted/50 border-border/10 rounded-[3rem] group/card relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-10"><Package size={40} /></div>
                                        <span className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] italic mb-6 block">MISSION_TELEMETRY</span>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center border-b border-border/5 pb-4">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Identifier</span>
                                                <span className="text-xl font-black text-white italic tracking-[0.2em]">{formData.Job_ID}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-border/5 pb-4">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Temporal Stamping</span>
                                                <span className="text-xl font-black text-muted-foreground italic tracking-widest uppercase text-right">{formData.Plan_Date} @ {formData.Plan_Time}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Payload Specs</span>
                                                <span className="text-xl font-black text-primary italic tracking-widest uppercase text-right">{formData.Cargo_Type || 'UNCLASSIFIED'} // {formData.Weight || '0'} KG</span>
                                            </div>
                                        </div>
                                    </PremiumCard>

                                    <PremiumCard className="p-10 bg-muted/50 border-border/10 rounded-[3rem] group/card relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-10"><MapPin size={40} /></div>
                                        <span className="text-base font-bold font-black text-emerald-500 uppercase tracking-[0.6em] italic mb-6 block">ENTITY_DESTINATION</span>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center border-b border-border/5 pb-4">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Target Node</span>
                                                <span className="text-xl font-black text-white italic tracking-[0.1em] uppercase text-right leading-none max-w-[200px]">{formData.Customer_Name || 'VOID_ENTITY'}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-border/5 pb-4">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Link Status</span>
                                                <span className="text-xl font-black text-muted-foreground italic tracking-widest uppercase font-sans">{formData.Customer_Phone || 'SIGNAL_LOST'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">Transit Vector</span>
                                                <span className="text-base font-bold font-black text-emerald-500 italic tracking-[0.3em] uppercase text-right">{formData.Origin_Location} → {formData.Dest_Location}</span>
                                            </div>
                                        </div>
                                    </PremiumCard>

                                    <PremiumCard className="lg:col-span-2 p-12 bg-primary/5 border-primary/20 rounded-[4rem] group/card relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse"><Target size={60} /></div>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12">
                                            <div className="space-y-2">
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.8em] italic block mb-4">DEPLOYMENT_SIGNALS</span>
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/10 flex items-center justify-center text-primary italic font-black shadow-inner">
                                                           {formData.Driver_Name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest block italic mb-1">Assigned Operator</span>
                                                            <span className="text-xl font-black text-white italic tracking-widest uppercase">{formData.Driver_Name || 'SELECTION_PENDING'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/10 flex items-center justify-center text-primary shadow-inner">
                                                            <Truck size={24} />
                                                        </div>
                                                        <div>
                                                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest block italic mb-1">Asset Allocation</span>
                                                            <span className="text-xl font-black text-white italic tracking-widest uppercase font-sans">{formData.Vehicle_Plate || 'ASSET_NULL'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-black/60 p-10 rounded-[3rem] border border-border/5 flex flex-col items-center justify-center min-w-[280px] shadow-2xl relative">
                                                <div className="absolute inset-0 bg-primary/5 blur-3xl" />
                                                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.5em] italic mb-6 relative z-10">INITIAL_VELOCITY</span>
                                                <div className="flex flex-col items-center gap-2 relative z-10">
                                                    <span className="text-lg font-bold font-black text-primary uppercase tracking-[0.4em] italic mb-2">READY_FOR_LIFT_OFF</span>
                                                    <div className="h-1.5 w-40 bg-muted/50 rounded-full overflow-hidden border border-border/5">
                                                        <motion.div 
                                                            className="h-full bg-primary shadow-[0_0_15px_rgba(255,30,133,1)]"
                                                            animate={{ x: [-160, 160] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </PremiumCard>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Operational Commands */}
                    <div className="p-10 bg-black/40 border-t border-border/5 flex flex-col md:flex-row items-center justify-between gap-10">
                        <PremiumButton 
                            variant="outline" 
                            onClick={prevStep} 
                            disabled={currentStep === 0} 
                            className="h-16 px-12 rounded-3xl border-border/5 bg-muted/50 hover:bg-muted/80 text-foreground font-black uppercase tracking-[0.2em] gap-4 disabled:opacity-20 italic italic"
                        >
                            <ChevronLeft className="w-6 h-6" /> RETURN_PREV
                        </PremiumButton>
                        
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            {currentStep < steps.length - 1 ? (
                                <PremiumButton 
                                    onClick={nextStep} 
                                    className="h-20 px-16 rounded-[2.5rem] bg-primary text-white font-black uppercase tracking-[0.2em] gap-5 shadow-[0_20px_50px_rgba(255,30,133,0.3)] hover:scale-105 transition-all text-xl w-full md:w-auto italic"
                                >
                                    PROCEED_NODE <ChevronRight className="w-6 h-6" />
                                </PremiumButton>
                            ) : (
                                <PremiumButton 
                                    onClick={handleSubmit} 
                                    disabled={loading} 
                                    className="h-20 px-16 rounded-[2.5rem] bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black uppercase tracking-[0.3em] gap-5 shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-105 transition-all w-full md:w-auto italic"
                                >
                                    {loading ? (
                                        <Loader2 className="w-7 h-7 animate-spin" />
                                    ) : (
                                        <Target className="w-7 h-7 animate-pulse" />
                                    )}
                                    BROADCAST_MISSION
                                </PremiumButton>
                            )}
                        </div>
                    </div>
                </PremiumCard>
            </motion.div>
        </AnimatePresence>

        {/* Tactical Advisory Footnote */}
        <div className="py-20 border-t border-border/5 flex flex-col items-center opacity-30">
            <div className="flex items-center gap-5 mb-3">
                <ShieldCheck size={20} className="text-muted-foreground" />
                <span className="text-[12px] font-black text-white uppercase tracking-[0.8em] italic">Mission Registry Protocol // SECURE_TERM</span>
            </div>
            <p className="text-base font-bold font-bold text-muted-foreground uppercase tracking-widest italic leading-relaxed text-center">
                All transmissions are encrypted via Tier-0 AES-256 routing. <br />
                System logs are updated in real-time across all global nodes.
            </p>
        </div>
    </div>
  )
}

