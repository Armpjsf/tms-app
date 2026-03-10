'use server'

import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'
import { createNotification } from './notification-actions'
import * as admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'

// Initialize Firebase Admin for Native Push (FCM)
if (!admin.apps.length) {
    try {
        let credential: admin.credential.Credential

        // Define environment variables for clarity and potential sanitization
        const envProjectId = process.env.FIREBASE_PROJECT_ID
        const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL
        const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY
        const envServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT

        if (envProjectId && envClientEmail && envPrivateKey) {
            // Preferred: individual env vars (safer for Vercel — avoids JSON newline corruption)
            // Robust sanitization: handle escaped newlines, literal quotes, and extra whitespace
            const privateKey = envPrivateKey
                .replace(/\\n/g, '\n')
                .replace(/"/g, '') // Remove literal quotes if present
                .trim()
            
            // Diagnostic check for email/project mismatch (optional, but good for debugging)
            if (!envClientEmail.includes(envProjectId)) {
                console.warn(`[Firebase Debug] Client Email (${envClientEmail}) does not contain Project ID (${envProjectId}). This might indicate a misconfiguration.`)
            }

            credential = admin.credential.cert({
                projectId: envProjectId,
                clientEmail: envClientEmail,
                privateKey,
            })
            console.log(`[Firebase Admin] Initialized via individual env vars for project: ${envProjectId}`)
        } else if (envServiceAccountJson) {
            // Fallback: full JSON blob
            try {
                const sa = JSON.parse(envServiceAccountJson) as admin.ServiceAccount
                credential = admin.credential.cert(sa)
                console.log('[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT JSON')
            } catch (jsonError) {
                console.error('[Firebase Admin] Error parsing FIREBASE_SERVICE_ACCOUNT JSON:', jsonError)
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format.')
            }
        } else {
            // Local dev fallback: read from file
            const KEY_FILE_PATH = join(process.cwd(), 'service_account.json')
            const sa = JSON.parse(readFileSync(KEY_FILE_PATH, 'utf8')) as admin.ServiceAccount
            credential = admin.credential.cert(sa)
            console.log('[Firebase Admin] Initialized via local service_account.json')
        }

        admin.initializeApp({ credential })
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error)
    }
}

// Configure web-push with VAPID keys
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tms-epod.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

/**
 * Save a push subscription to the database
 */
export async function savePushSubscription(driverId: string, subscription: any) {
    const supabase = await createClient()

    // Native FCM Push tokens pass { isFCM: true, endpoint: 'token_string' }
    const isFCM = subscription.isFCM === true

    // Upsert — if driver already has a subscription, replace it
    const { error } = await supabase
        .from('Push_Subscriptions')
        .upsert({
            Driver_ID: driverId,
            Endpoint: subscription.endpoint,
            Keys_P256dh: subscription.keys?.p256dh || '',
            Keys_Auth: isFCM ? 'FCM' : (subscription.keys?.auth || ''),
            Updated_At: new Date().toISOString()
        }, { onConflict: 'Driver_ID' })

    if (error) {
        console.error('[Push] Save subscription error:', error)
        return { success: false, error: error.message }
    }

    console.log(`[Push] Subscription saved for driver: ${driverId} (FCM: ${isFCM})`)
    return { success: true }
}

/**
 * Send a push notification to a specific driver
 */
export async function sendPushToDriver(driverId: string, payload: {
    title: string
    body: string
    url?: string
}) {
    const supabase = await createClient()

    // 1. Get the driver's push subscription
    const { data: sub, error } = await supabase
        .from('Push_Subscriptions')
        .select('*')
        .eq('Driver_ID', driverId)
        .single()

    if (error || !sub) {
        console.log(`[Push] No subscription found for driver: ${driverId}`)
        return { success: false, reason: 'no_subscription' }
    }

    // Check if this is an FCM Native Push notification
    if (sub.Keys_Auth === 'FCM') {
        try {
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: {
                    url: payload.url || '/mobile/jobs'
                },
                token: sub.Endpoint
            }
            await admin.messaging().send(message)
            console.log(`[Push] Native FCM Notification sent to driver: ${driverId}`)
            return { success: true }
        } catch (err: any) {
            console.error(`[Push] FCM Send failed for ${driverId}:`, err)
            // Remove token if not found/unregistered
            if (err.code === 'messaging/registration-token-not-registered') {
                await supabase.from('Push_Subscriptions').delete().eq('Driver_ID', driverId)
            }
            return { success: false, reason: 'send_failed' }
        }
    }

    // 2. Build the Web Push subscription object
    const pushSubscription = {
        endpoint: sub.Endpoint,
        keys: {
            p256dh: sub.Keys_P256dh,
            auth: sub.Keys_Auth
        }
    }

    // 3. Send Web Push notification
    try {
        await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
                title: payload.title,
                body: payload.body,
                url: payload.url || '/mobile/jobs'
            })
        )
        console.log(`[Push] Web Notification sent to driver: ${driverId}`)
        return { success: true }
    } catch (err: any) {
        console.error(`[Push] Send failed for ${driverId}:`, err.statusCode, err.body)

        // If subscription has expired/is invalid, remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
                .from('Push_Subscriptions')
                .delete()
                .eq('Driver_ID', driverId)
            console.log(`[Push] Removed expired subscription for ${driverId}`)
        }

        return { success: false, reason: 'send_failed' }
    }
}

/**
 * Notify driver of a new job assignment — creates DB notification + sends push
 */
export async function notifyDriverNewJob(driverId: string, jobId: string, customerName: string) {
    // 1. Create in-app notification
    await createNotification({
        Driver_ID: driverId,
        Title: '📦 งานใหม่สำหรับคุณ!',
        Message: `งาน ${jobId} • ลูกค้า: ${customerName}`,
        Type: 'info',
        Link: `/mobile/jobs/${jobId}`
    })

    // 2. Send push notification
    await sendPushToDriver(driverId, {
        title: '📦 งานใหม่สำหรับคุณ!',
        body: `งาน ${jobId} • ลูกค้า: ${customerName}`,
        url: `/mobile/jobs/${jobId}`
    })
}
