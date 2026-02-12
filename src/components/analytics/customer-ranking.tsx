"use client"

type CustomerStat = {
  name: string
  revenue: number
  jobCount: number
}

export function CustomerRanking({ data }: { data: CustomerStat[] }) {
  return (
    <div className="space-y-4">
      {data.map((customer, index) => (
        <div 
          key={customer.name}
          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                index === 0 ? 'bg-yellow-500' :
                index === 1 ? 'bg-slate-400' :
                index === 2 ? 'bg-orange-700' : 'bg-slate-700'
             }`}>
                {index + 1}
             </div>
             <div>
                <p className="font-medium text-white">{customer.name}</p>
                <p className="text-xs text-slate-400">{customer.jobCount} งาน</p>
             </div>
          </div>
          <div className="text-right">
             <p className="font-bold text-emerald-400">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(customer.revenue)}
             </p>
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-500">
            ไม่มีข้อมูลลูกค้า
        </div>
      )}
    </div>
  )
}
