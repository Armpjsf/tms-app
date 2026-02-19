"use client"



type StatusItem = {
    name: string;
    value: number;
}

export function StatusDistribution({ data }: { data: StatusItem[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Sort order for pipeline feel
    const order = ['Draft', 'Pending', 'Confirmed', 'In Progress', 'Delivered', 'Completed', 'Cancelled'];
    const sortedData = [...data].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':
            case 'Delivered': return 'bg-emerald-500';
            case 'In Progress': return 'bg-blue-500';
            case 'Confirmed': return 'bg-indigo-500';
            case 'Cancelled': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="space-y-4">
            {sortedData.map((item) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                    <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">{item.name}</span>
                            <span className="text-white font-bold">{item.value} <span className="text-slate-500 font-normal">({percentage.toFixed(1)}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`${getStatusColor(item.name)} h-full transition-all`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500">งานทั้งหมด (Total Jobs)</span>
                <span className="text-sm font-bold text-white">{total} รายการ</span>
            </div>
        </div>
    );
}
