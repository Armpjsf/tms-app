import { getAllDriversFromTable, type Driver } from "@/lib/supabase/drivers"
import { getAllDrivers } from "@/lib/supabase/jobs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Phone, MoreHorizontal, Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function DriversPage() {
  // Try to get from Master_Drivers table first
  let drivers: Driver[] = await getAllDriversFromTable()
  
  // Fallback to extracting from Jobs if Master_Drivers is empty
  if (drivers.length === 0) {
    const jobDrivers = await getAllDrivers()
    drivers = jobDrivers.map((d: { Driver_ID: string; Driver_Name: string; Vehicle_Plate: string }) => ({
      Driver_ID: d.Driver_ID,
      Driver_Name: d.Driver_Name,
      Role: 'Driver',
      Mobile_No: null,
      Line_User_ID: null,
      Password: null,
      Vehicle_Plate: d.Vehicle_Plate,
      Vehicle_Type: null,
      Max_Weight_kg: null,
      Max_Volume_cbm: null,
      Insurance_Expiry: null,
      Tax_Expiry: null,
      Act_Expiry: null,
      Current_Mileage: null
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Driver Management</h1>
          <p className="text-slate-400">พนักงานขับรถทั้งหมด ({drivers.length})</p>
        </div>
        <Link href="/admin/drivers/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มคนขับ
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="ค้นหาชื่อ, เบอร์โทร..."
            className="pl-9 bg-slate-900 border-slate-800 text-white"
          />
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Phone</TableHead>
              <TableHead className="text-slate-400">Vehicle</TableHead>
              <TableHead className="text-slate-400">Role</TableHead>
              <TableHead className="text-right text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver, index) => (
              <TableRow key={driver.Driver_ID || index} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-700">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.Driver_Name}`} />
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-200">{driver.Driver_Name || '-'}</p>
                      <p className="text-xs text-slate-500">{driver.Driver_ID}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">
                  {driver.Mobile_No ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-500" />
                      {driver.Mobile_No}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-slate-400">{driver.Vehicle_Plate || '-'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    driver.Role === 'Admin' 
                      ? 'bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                  }`}>
                    {driver.Role || 'Driver'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {drivers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  ไม่พบข้อมูลคนขับ - กดปุ่ม &quot;เพิ่มคนขับ&quot; เพื่อเริ่มต้น
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
