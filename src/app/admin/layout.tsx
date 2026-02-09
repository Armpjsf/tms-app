import { AdminSidebar } from "@/components/admin/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar - Hidden on mobile, typically controlled by a sheet/drawer on smaller screens */}
      <aside className="hidden md:block h-full">
        <AdminSidebar />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header (Optional - mostly for mobile toggle) */}
        <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-950/50 backdrop-blur-sm md:hidden">
            <span className="font-semibold text-slate-200">TMS Admin</span>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
