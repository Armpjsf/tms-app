export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {children}
      </main>
    </div>
  )
}
