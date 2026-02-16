
import { getSession } from "@/lib/session"
import { getUserProfile } from "@/lib/supabase/users"

export default async function ProfileDebugPage() {
    const session = await getSession()
    const profile = await getUserProfile()

    return (
        <div className="p-10 text-white bg-slate-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Profile Debug Info</h1>
            
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Session Payload:</h2>
                <pre className="bg-slate-800 p-4 rounded overflow-auto">
                    {JSON.stringify(session, null, 2) || "NULL SESSION"}
                </pre>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-2">Profile Data:</h2>
                <pre className="bg-slate-800 p-4 rounded overflow-auto">
                    {JSON.stringify(profile, null, 2) || "NULL PROFILE"}
                </pre>
            </section>
        </div>
    )
}
