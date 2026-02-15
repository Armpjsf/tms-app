'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { getJobCreationData } from '@/app/planning/actions'

export default function DebugDBPage() {
  const [clientData, setClientData] = useState<any>(null)
  const [clientError, setClientError] = useState<any>(null)
  const [serverData, setServerData] = useState<any>(null)
  
  useEffect(() => {
    // 1. Client-side fetch
    const fetchClient = async () => {
      try {
        const supabase = createClient()
        const { data, error, count } = await supabase
          .from('Master_Customers')
          .select('*', { count: 'exact' })
          .limit(5)
        
        if (error) setClientError(error)
        else setClientData({ count, data })
      } catch (e) {
        setClientError(e)
      }
    }

    // 2. Server action fetch
    const fetchServer = async () => {
      try {
        const result = await getJobCreationData()
        setServerData(result)
      } catch (e) {
        setServerData({ error: e })
      }
    }

    fetchClient()
    fetchServer()
  }, [])

  return (
    <div className="p-8 bg-slate-900 text-white min-h-screen font-mono">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Database Debugger</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Client Side Results */}
        <div className="border border-slate-700 p-4 rounded-lg bg-slate-800">
          <h2 className="text-xl font-bold mb-4 text-blue-400">Client-Side Fetch</h2>
          {clientError ? (
             <div className="bg-red-900/50 p-4 rounded border border-red-500 text-red-200">
                <h3 className="font-bold">Error:</h3>
                <pre className="whitespace-pre-wrap">{JSON.stringify(clientError, null, 2)}</pre>
             </div>
          ) : clientData ? (
             <div className="space-y-2">
                <p><strong>Total Count:</strong> {clientData.count}</p>
                <p><strong>First 5 rows:</strong></p>
                <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto max-h-[400px]">
                    {JSON.stringify(clientData.data, null, 2)}
                </pre>
             </div>
          ) : (
            <p className="animate-pulse">Loading client data...</p>
          )}
        </div>

        {/* Server Action Results */}
        <div className="border border-slate-700 p-4 rounded-lg bg-slate-800">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Server Action (getJobCreationData)</h2>
           {serverData ? (
             <div className="space-y-2">
                <p><strong>Customers Count:</strong> {serverData.customers?.length}</p>
                <p><strong>Drivers Count:</strong> {serverData.drivers?.length}</p>
                 <p><strong>First Customer:</strong></p>
                <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto max-h-[200px]">
                    {JSON.stringify(serverData.customers?.[0], null, 2)}
                </pre>
                {serverData.customers?.length === 0 && (
                     <p className="text-yellow-400">⚠️ No customers returned from server action</p>
                )}
             </div>
          ) : (
            <p className="animate-pulse">Loading server data...</p>
          )}
        </div>
      </div>
    </div>
  )
}
