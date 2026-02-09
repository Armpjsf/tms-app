import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch" // We don't have switch yet, so use simple checkbox or skip
import { Bell, Lock, User } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><User className="h-5 w-5" /> Profile Info</CardTitle>
                <CardDescription>Update your admin profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-400">First Name</Label>
                        <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="Admin" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">Last Name</Label>
                        <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="User" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-400">Email</Label>
                    <Input className="bg-slate-950 border-slate-800 text-white" defaultValue="admin@logis-pro.com" disabled />
                </div>
                <Button>Save Changes</Button>
            </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
               <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded">
                    <span>Email Alerts for New Jobs</span>
                    <div className="h-5 w-10 bg-green-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 h-3 w-3 bg-white rounded-full shadow" /></div>
               </div>
               <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded">
                    <span>SMS Alerts for SOS</span>
                    <div className="h-5 w-10 bg-green-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 h-3 w-3 bg-white rounded-full shadow" /></div>
               </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
