'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, getCustomerId, isSuperAdmin, isAdmin } from "@/lib/permissions"
import { Job, JobContainer } from '@/types/database'
import { todayTH } from "@/lib/utils/date-th"

export type ContainerJob = Job & {
    container: JobContainer
}

export async function getContainerJobs() {
    const isSuper = await isSuperAdmin()
    const isRegularAdmin = await isAdmin()
    const userBranchId = await getUserBranchId()
    const customerId = await getCustomerId()
    const supabase = (isSuper || isRegularAdmin || customerId) ? await createAdminClient() : await createClient()

    let query = supabase
        .from('Jobs_Main')
        .select(`
            *,
            container:jobs_container(*),
            temp_logs:container_temp_logs(temperature, recorded_at)
        `)
        .eq('job_type', 'container')
        .order('Created_At', { ascending: false })

    // Customer isolation takes priority, then branch isolation for non-super users.
    if (customerId) {
        query = query.eq('Customer_ID', customerId)
    } else if (!isSuper) {
        if (userBranchId && userBranchId !== 'All') {
            query = query.eq('Branch_ID', userBranchId)
        } else {
            return []
        }
    }

    const { data, error } = await query

    if (error) {
        console.error('[CONTAINER_FETCH_ERROR]', error)
        return []
    }

    // Process to get only the latest temp log for each job
    const processed = data.map((job: ContainerJob & { temp_logs?: { temperature: number, recorded_at: string }[] }) => {
        const latestTemp = job.temp_logs && job.temp_logs.length > 0
            ? job.temp_logs.sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
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
    const today = todayTH()
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Derive from the customer/branch-scoped container jobs so the stats match
    // exactly what the user is allowed to see (and joins to the real status).
    const jobs = await getContainerJobs()

    const lfdOf = (job: ContainerJob) => job.container?.lfd_detention || job.container?.lfd_demurrage || null

    const total = jobs.length
    const active = jobs.filter((j) => j.Job_Status !== 'Completed').length
    const nearLfd = jobs.filter((j) => {
        const lfd = lfdOf(j)
        return lfd && lfd >= today && lfd <= threeDaysLater
    }).length
    const overdue = jobs.filter((j) => {
        const lfd = lfdOf(j)
        return lfd && lfd < today
    }).length

    return { total, active, nearLfd, overdue }
}
