import { createAdminClient } from "@/utils/supabase/server"
import { ChecksClient } from "./checks-client"
import { ShieldCheck } from "lucide-react"

export const revalidate = 0

export default async function AdminVehicleChecksPage() {
    const supabase = createAdminClient()
    
    try {
        const { data: checks } = await supabase
            .from('Vehicle_Checks')
            .select('*')
            .order('Check_Date', { ascending: false })
            .limit(100)

        return (
            <>
                <ChecksClient checks={checks || []} />
                
                <div className="mt-12 text-center mb-20 px-4">
                    <div className="inline-flex items-center gap-3 px-6 py-2 glass-panel rounded-full text-base font-bold font-black text-muted-foreground uppercase tracking-[0.5em] opacity-40">
                        <ShieldCheck size={14} /> Encrypted Tactical Ledger Node v4.2
                    </div>
                </div>
            </>
        )
    } catch {
        return (
            <div className="p-20 text-center space-y-6">
                <ShieldCheck size={64} className="mx-auto text-primary animate-pulse" />
                <h1 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">Emergency Hub Lock</h1>
                <p className="text-muted-foreground font-black uppercase tracking-widest text-lg font-bold">Registry synchronization protocol failed. Seek administrative uplink.</p>
            </div>
        )
    }
}

