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
          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
        >
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                index === 0 ? 'bg-yellow-600' :
                index === 1 ? 'bg-slate-700' :
                index === 2 ? 'bg-orange-900' : 'bg-card'
             }`}>
                {index + 1}
             </div>
             <div>
                <p className="font-black text-gray-900">{customer.name}</p>
                <p className="text-lg font-bold text-gray-700 font-bold">{customer.jobCount} งาน</p>
             </div>
          </div>
          <div className="text-right">
             <p className="font-black text-emerald-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(customer.revenue)}
             </p>
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-400">
            ไม่มีข้อมูลลูกค้า
        </div>
      )}
    </div>
  )
}

