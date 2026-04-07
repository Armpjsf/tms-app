export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-indigo-100">
      <main className="container mx-auto px-2 md:px-4 py-6 md:py-10 max-w-4xl overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
