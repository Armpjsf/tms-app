"use client"

import { submitJobPOD } from "@/lib/actions/pod-actions"

interface OfflineJob {
    id: string
    jobId: string
    data: any // Serialized FormData or object
    timestamp: number
    type: 'POD' | 'PICKUP'
}

const STORAGE_KEY = 'tms_offline_jobs'

export const saveJobOffline = (jobId: string, data: any, type: 'POD' | 'PICKUP' = 'POD') => {
    if (typeof window === 'undefined') return
    
    const offlineJobs: OfflineJob[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    offlineJobs.push({
        id: crypto.randomUUID(),
        jobId,
        data,
        timestamp: Date.now(),
        type
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineJobs))
}

export const getOfflineJobs = (): OfflineJob[] => {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

export const removeOfflineJob = (id: string) => {
    if (typeof window === 'undefined') return
    const offlineJobs: OfflineJob[] = getOfflineJobs()
    const filtered = offlineJobs.filter(j => j.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * Attempts to sync all offline jobs to the server
 */
export const syncOfflineJobs = async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return
    
    const jobs = getOfflineJobs()
    if (jobs.length === 0) return

    console.log(`Attempting to sync ${jobs.length} offline jobs...`)

    for (const job of jobs) {
        try {
            // Reconstruct FormData from stored data
            const formData = new FormData()
            Object.entries(job.data).forEach(([key, value]) => {
                if (key === 'photos' && Array.isArray(value)) {
                    value.forEach((b64: string, i: number) => {
                        const blob = b64ToBlob(b64)
                        formData.append(`photo_${i}`, blob, `offline_photo_${i}.jpg`)
                    })
                    formData.append('photo_count', value.length.toString())
                } else if (key === 'signature' && typeof value === 'string') {
                    formData.append('signature', b64ToBlob(value), 'signature.png')
                } else {
                    formData.append(key, value as string)
                }
            })

            const result = await submitJobPOD(job.jobId, formData)
            if (result.success) {
                console.log(`Successfully synced offline job: ${job.jobId}`)
                removeOfflineJob(job.id)
            }
        } catch (err) {
            console.error(`Failed to sync offline job ${job.jobId}:`, err)
        }
    }
}

// Helper to convert base64 to Blob
function b64ToBlob(b64Data: string, contentType = 'image/jpeg') {
    const byteCharacters = atob(b64Data.split(',')[1])
    const byteArrays = []
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512)
        const byteNumbers = new Array(slice.length)
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
    }
    
    return new Blob(byteArrays, { type: contentType })
}
