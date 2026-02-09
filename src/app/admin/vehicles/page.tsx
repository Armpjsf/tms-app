import { getAllVehiclesFromTable, type Vehicle } from "@/lib/supabase/vehicles"
import { getAllVehicles } from "@/lib/supabase/jobs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Truck, ShieldCheck, Plus, MoreHorizontal } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
  // Try to get from master_vehicles table first
  let vehicles: Vehicle[] = await getAllVehiclesFromTable()
  
  // Fallback to extracting from Jobs if empty
  if (vehicles.length === 0) {
    const jobVehicles = await getAllVehicles()
    vehicles = jobVehicles.map((v: { Vehicle_Plate: string }) => ({
      vehicle_plate: v.Vehicle_Plate,
      vehicle_type: '4-Wheel',
      brand: null,
      model: null,
      year: null,
      color: null,
      engine_no: null,
      chassis_no: null,
      max_weight_kg: null,
      max_volume_cbm: null,
      insurance_company: null,
      insurance_expiry: null,
      tax_expiry: null,
      act_expiry: null,
      current_mileage: null,
      last_service_date: null,
      next_service_mileage: null,
      driver_id: null,
      branch_id: null,
      active_status: 'Active',
      notes: null
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Fleet Management</h1>
          <p className="text-slate-400">ข้อมูลยานพาหนะทั้งหมด ({vehicles.length} คัน)</p>
        </div>
        <Link href="/admin/vehicles/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มรถ
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          type="search"
          placeholder="ค้นหาทะเบียนรถ..."
          className="pl-9 bg-slate-900 border-slate-800 text-white"
        />
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-400">Vehicle Plate</TableHead>
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Brand / Model</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v, index) => (
              <TableRow key={v.vehicle_plate || index} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
                      <Truck className="h-4 w-4 text-blue-400" />
                    </div>
                    {v.vehicle_plate}
                  </div>
                </TableCell>
                <TableCell className="text-slate-400">{v.vehicle_type || '4-Wheel'}</TableCell>
                <TableCell className="text-slate-300">
                  {v.brand && v.model ? `${v.brand} ${v.model}` : v.brand || v.model || '-'}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    v.active_status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : v.active_status === 'In Use'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <ShieldCheck className="h-3 w-3" />
                    {v.active_status || 'Active'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  ไม่พบข้อมูลรถ - กดปุ่ม &quot;เพิ่มรถ&quot; เพื่อเริ่มต้น
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
