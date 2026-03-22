"use client"

import { submitJobPOD, submitJobPickup } from "@/lib/actions/pod-actions"

interface OfflineJob {
    id: string
    jobId: string
    data: Record<string, unknown>
    timestamp: number
    type: 'POD' | 'PICKUP'
}

const STORAGE_KEY = 'tms_offline_jobs'

const notifyQueueChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tms_offline_queue_change'))
    }
}

export const saveJobOffline = (jobId: string, data: Record<string, unknown>, type: 'POD' | 'PICKUP' = 'POD') => {
    if (typeof window === 'undefined') return
    
    // Add current time as the actual completion time
    const enrichedData = {
        ...data,
        actualCompletionTime: new Date().toISOString()
    }

    const offlineJobs: OfflineJob[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    offlineJobs.push({
        id: crypto.randomUUID(),
        jobId,
        data: enrichedData,
        timestamp: Date.now(),
        type
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineJobs))
    notifyQueueChange()
}

export const getOfflineJobs = (): OfflineJob[] => {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

export const removeOfflineJob = (id: string) => {
    if (typeof window === 'undefined') return
    const offlineJobs: OfflineJob[] = getOfflineJobs()
    const filtered = offlineJobs.filter(j => j.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    notifyQueueChange()
}

/**
 * Attempts to sync all offline jobs to the server
 */
export const syncOfflineJobs = async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return
    
    const jobs = getOfflineJobs()
    if (jobs.length === 0) return

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
                } else if (key === 'pod_report' && typeof value === 'string') {
                    formData.append('pod_report', b64ToBlob(value), 'report.jpg')
                } else if (key === 'pickup_report' && typeof value === 'string') {
                    formData.append('pickup_report', b64ToBlob(value), 'report.jpg')
                } else if (value !== null && value !== undefined) {
                    formData.append(key, String(value))
                }
            })

            const result = job.type === 'PICKUP' 
                ? await submitJobPickup(job.jobId, formData)
                : await submitJobPOD(job.jobId, formData)

            if (result.success) {
                removeOfflineJob(job.id)
            }
        } catch (_error) {
            // Failed to sync
        }
    }
}

// Helpers
export function blobToB64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

function b64ToBlob(b64Data: string, contentType = 'image/jpeg') {
    if (!b64Data.includes(',')) return new Blob([], { type: contentType })
    
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
