import { BottomNav } from "@/components/mobile/bottom-nav"
import { LocationTracker } from "@/components/mobile/location-tracker"

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-16">
      <LocationTracker />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  )
}
