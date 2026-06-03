'use server'

import { createClient } from '@/utils/supabase/server'
import { Job, JobContainer } from '@/types/database'

export type ContainerJob = Job & {
    container: JobContainer
}

export async function getContainerJobs() {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('Jobs_Main')
        .select(`
            *,
            container:jobs_container(*),
            temp_logs:container_temp_logs(temperature, recorded_at)
        `)
        .eq('job_type', 'container')
        .order('Created_At', { ascending: false })
    
    if (error) {
        console.error('[CONTAINER_FETCH_ERROR]', error)
        return []
    }

    // Process to get only the latest temp log for each job
    const processed = data.map((job: any) => {
        const latestTemp = job.temp_logs && job.temp_logs.length > 0
            ? job.temp_logs.sort((a: any, b: any) => 
                new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
              )[0]
            : null
        
        return {
            ...job,
            latest_temp: latestTemp?.temperature || null
        }
    })

    return processed as (ContainerJob & { latest_temp: number | null })[]
}

export async function getContainerStats() {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('jobs_container')
        .select(`
            container_id,
            lfd_detention,
            lfd_demurrage,
            Jobs_Main!inner(Job_Status)
        `)

    if (error) return { total: 0, active: 0, nearLfd: 0, overdue: 0 }

    const total = data.length
    const active = data.filter((d: any) => d.Jobs_Main.Job_Status !== 'Completed').length
    
    const nearLfd = data.filter((d: any) => {
        const lfd = d.lfd_detention || d.lfd_demurrage
        return lfd && lfd >= today && lfd <= threeDaysLater
    }).length

    const overdue = data.filter((d: any) => {
        const lfd = d.lfd_detention || d.lfd_demurrage
        return lfd && lfd < today
    }).length

    return { total, active, nearLfd, overdue }
}
