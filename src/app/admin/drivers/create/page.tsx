import { createDriver } from "@/lib/supabase/drivers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function CreateDriverPage() {
  async function submitAction(formData: FormData) {
    "use server"
    
    const driverData = {
      Driver_ID: formData.get("driver_id") as string || `DRV-${Date.now()}`,
      Driver_Name: formData.get("name") as string,
      Mobile_No: formData.get("phone") as string,
      Role: formData.get("role") as string || "Driver",
      Vehicle_Plate: formData.get("vehicle") as string,
      Vehicle_Type: formData.get("vehicle_type") as string
    }

    const res = await createDriver(driverData)
    if (res.success) redirect("/admin/drivers")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/drivers">
          <Button variant="outline" size="icon" className="h-10 w-10 border-slate-700 bg-slate-900">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Add New Driver</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Driver Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver_id" className="text-slate-400">Driver ID</Label>
                <Input id="driver_id" name="driver_id" className="bg-slate-950 border-slate-800 text-white" placeholder="DRV-001 (auto if blank)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-400">Name *</Label>
                <Input id="name" name="name" required className="bg-slate-950 border-slate-800 text-white" placeholder="ชื่อ-นามสกุล" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-400">Phone</Label>
                <Input id="phone" name="phone" className="bg-slate-950 border-slate-800 text-white" placeholder="08X-XXX-XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-400">Role</Label>
                <select id="role" name="role" className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white">
                  <option value="Driver">Driver</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle" className="text-slate-400">Vehicle Plate</Label>
                <Input id="vehicle" name="vehicle" className="bg-slate-950 border-slate-800 text-white" placeholder="1กก-1234" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_type" className="text-slate-400">Vehicle Type</Label>
                <select id="vehicle_type" name="vehicle_type" className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white">
                  <option value="4-Wheel">4-Wheel Truck</option>
                  <option value="6-Wheel">6-Wheel Truck</option>
                  <option value="10-Wheel">10-Wheel Truck</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Create Driver</Button>
              <Link href="/admin/drivers" className="flex-1">
                <Button type="button" variant="outline" className="w-full border-slate-700">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
