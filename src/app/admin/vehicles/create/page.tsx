import { createVehicle } from "@/lib/supabase/vehicles"
import { getAllDriversFromTable } from "@/lib/supabase/drivers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function CreateVehiclePage() {
  const drivers = await getAllDriversFromTable()

  async function submitAction(formData: FormData) {
    "use server"
    
    const vehicleData = {
      vehicle_plate: formData.get("plate") as string,
      vehicle_type: formData.get("type") as string,
      brand: formData.get("brand") as string,
      model: formData.get("model") as string,
      driver_id: formData.get("driver") as string || null,
      active_status: "Active"
    }

    const res = await createVehicle(vehicleData)
    if (res.success) redirect("/admin/vehicles")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/vehicles">
          <Button variant="outline" size="icon" className="h-10 w-10 border-slate-700 bg-slate-900">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Add New Vehicle</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate" className="text-slate-400">Plate Number *</Label>
                <Input id="plate" name="plate" required className="bg-slate-950 border-slate-800 text-white" placeholder="1กก-1234" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-400">Vehicle Type</Label>
                <select id="type" name="type" className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white">
                  <option value="4-Wheel">4-Wheel Truck</option>
                  <option value="6-Wheel">6-Wheel Truck</option>
                  <option value="10-Wheel">10-Wheel Truck</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-slate-400">Brand</Label>
                <Input id="brand" name="brand" className="bg-slate-950 border-slate-800 text-white" placeholder="HINO" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model" className="text-slate-400">Model</Label>
                <Input id="model" name="model" className="bg-slate-950 border-slate-800 text-white" placeholder="500 Series" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver" className="text-slate-400">Assign Driver (Optional)</Label>
              <select id="driver" name="driver" className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white">
                <option value="">-- No Driver --</option>
                {drivers.map((driver) => (
                  <option key={driver.Driver_ID} value={driver.Driver_ID}>
                    {driver.Driver_Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-6 flex gap-3">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Create Vehicle</Button>
              <Link href="/admin/vehicles" className="flex-1">
                <Button type="button" variant="outline" className="w-full border-slate-700">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
