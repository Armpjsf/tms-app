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
                    <div key={item.name} className="space-y-2">
                        <div className="flex justify-between text-base font-bold transition-colors">
                            <span className="text-muted-foreground font-black uppercase italic">{item.name}</span>
                            <span className="text-foreground font-black italic">{item.value} <span className="text-muted-foreground/60 font-bold">({percentage.toFixed(1)}%)</span></span>
                        </div>
                        <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border border-border/5 p-0.5">
                            <div 
                                className={`${getStatusColor(item.name)} h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-700`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            <div className="pt-6 border-t border-border/10 flex justify-between items-center transition-colors">
                <span className="text-base font-black text-muted-foreground uppercase italic">งานทั้งหมด (Total Jobs)</span>
                <span className="text-2xl font-black text-foreground italic">{total}</span>
            </div>
        </div>
    );
}
