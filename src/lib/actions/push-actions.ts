'use server'

import webpush from 'web-push'
import { createAdminClient } from '@/utils/supabase/server'
import { createNotification } from './notification-actions'
import { logActivity } from '@/lib/supabase/logs'
import * as admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'

// Initialize Firebase Admin for Native Push (FCM)
if (!admin.apps.length) {
    try {
        let credential: admin.credential.Credential

        const envProjectId = process.env.FIREBASE_PROJECT_ID
        const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL
        const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY
        const envServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT

        if (envProjectId && envClientEmail && envPrivateKey) {
            const privateKey = envPrivateKey
                .replace(/\\n/g, '\n')
                .replace(/"/g, '')
                .trim()

            credential = admin.credential.cert({
                projectId: envProjectId,
                clientEmail: envClientEmail,
                privateKey,
            })
        } else if (envServiceAccountJson) {
            try {
                const sa = JSON.parse(envServiceAccountJson) as admin.ServiceAccount
                credential = admin.credential.cert(sa)
            } catch {
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format.')
            }
        } else {
            const KEY_FILE_PATH = join(process.cwd(), 'service_account.json')
            const sa = JSON.parse(readFileSync(KEY_FILE_PATH, 'utf8')) as admin.ServiceAccount
            credential = admin.credential.cert(sa)
        }

        admin.initializeApp({ credential })
        console.log("Firebase Admin Initialized Successfully")
    } catch (err) {
        console.error("Firebase Admin Initialization Failed:", err)
    }
}

// Configure web-push with VAPID keys
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tms-epod.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface PushSubscription {
    endpoint: string;
    keys?: {
        p256dh: string;
        auth: string;
    };
    isFCM?: boolean;
}

export type PushPayload = {
    title: string
    body: string
    url?: string
    /** 'chat' | 'new_job' | 'sos' | 'marketplace' | 'status_update' */
    type?: string
    /** Extra data for action buttons in SW */
    actions?: { action: string; title: string }[]
    tag?: string
    driverPhone?: string // For SOS call button
}

// ─────────────────────────────────────────────
// Core: Send one Web Push subscription
// ─────────────────────────────────────────────
async function sendWebPush(sub: { Endpoint: string; Keys_P256dh: string; Keys_Auth: string }, payload: PushPayload) {
    try {
        await webpush.sendNotification(
            { endpoint: sub.Endpoint, keys: { p256dh: sub.Keys_P256dh, auth: sub.Keys_Auth } },
            JSON.stringify(payload)
        )
        return { success: true }
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err) {
            return { success: false, statusCode: (err as { statusCode: number }).statusCode }
        }
        return { success: false, statusCode: 0 }
    }
}

// ─────────────────────────────────────────────
// Save Driver Push Subscription
// ─────────────────────────────────────────────
export async function savePushSubscription(driverId: string, subscription: PushSubscription) {
    const supabase = await createAdminClient()
    const isFCM = subscription.isFCM === true

    const { error } = await supabase
        .from('Push_Subscriptions')
        .upsert({
            Driver_ID: driverId,
            User_ID: null,
            Endpoint: subscription.endpoint,
            Keys_P256dh: subscription.keys?.p256dh || '',
            Keys_Auth: isFCM ? 'FCM' : (subscription.keys?.auth || ''),
            Updated_At: new Date().toISOString()
        }, { onConflict: 'Driver_ID' })

    if (error) {
        return { success: false, error: error.message }
    }
    return { success: true }
}

// ─────────────────────────────────────────────
// Save Admin Push Subscription (Web Push on Desktop)
// ─────────────────────────────────────────────
export async function saveAdminPushSubscription(userId: string, subscription: PushSubscription) {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('Push_Subscriptions')
        .upsert({
            Driver_ID: null,
            User_ID: userId,
            Endpoint: subscription.endpoint,
            Keys_P256dh: subscription.keys?.p256dh || '',
            Keys_Auth: subscription.keys?.auth || '',
            Updated_At: new Date().toISOString()
        }, { onConflict: 'User_ID' })

    if (error) {
        return { success: false, error: error.message }
    }
    return { success: true }
}

// ─────────────────────────────────────────────
// Send Push to a Specific Driver
// ─────────────────────────────────────────────
export async function sendPushToDriver(driverId: string, payload: PushPayload) {
    const supabase = await createAdminClient()

    const { data: sub, error } = await supabase
        .from('Push_Subscriptions')
        .select('*')
        .eq('Driver_ID', driverId)
        .single()

    if (error || !sub) {
        return { success: false, reason: 'no_subscription' }
    }

    // FCM Native Push
    if (sub.Keys_Auth === 'FCM') {
        try {
            await admin.messaging().send({
                notification: { title: payload.title, body: payload.body },
                data: { url: payload.url || '/mobile/jobs', type: payload.type || 'general' },
                android: {
                    notification: {
                        sound: 'default',
                        channelId: 'tms-notifications',
                        priority: 'high',
                        vibrateTimingsMillis: [0, 300, 100, 300, 100, 400],
                    }
                },
                token: sub.Endpoint
            })
            return { success: true }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'code' in err &&
                (err as { code: string }).code === 'messaging/registration-token-not-registered') {
                await supabase.from('Push_Subscriptions').delete().eq('Driver_ID', driverId)
            }
            return { success: false, reason: 'send_failed' }
        }
    }

    // Web Push
    console.log(`[PUSH] Attempting Web Push to driver: ${driverId}`)
    const result = await sendWebPush(sub, { ...payload, url: payload.url || '/mobile/jobs' })

    if (!result.success && (result.statusCode === 404 || result.statusCode === 410)) {
        console.log(`[PUSH] Removing expired subscription for driver ${driverId}`)
        await supabase.from('Push_Subscriptions').delete().eq('Driver_ID', driverId)
    }

    console.log(`[PUSH] Web Push to driver ${driverId}: ${result.success ? 'OK' : `FAIL (${result.statusCode})`}`)
    return result.success ? { success: true } : { success: false, reason: 'send_failed' }
}

// ─────────────────────────────────────────────
// Send Push to All Admin Users
// ─────────────────────────────────────────────
export async function sendPushToAdmins(payload: PushPayload) {
    const supabase = await createAdminClient()

    const { data: subs, error } = await supabase
        .from('Push_Subscriptions')
        .select('*')
        .not('User_ID', 'is', null)

    if (error || !subs || subs.length === 0) {
        console.log('[PUSH] No admin subscriptions found')
        return { success: false, reason: 'no_admin_subscriptions' }
    }

    console.log(`[PUSH] Sending push to ${subs.length} admin(s)`)

    const results = await Promise.allSettled(
        subs.map(async (sub) => {
            const result = await sendWebPush(sub, { ...payload, url: payload.url || '/chat' })
            // Clean up expired subscriptions
            if (!result.success && (result.statusCode === 404 || result.statusCode === 410)) {
                await supabase.from('Push_Subscriptions').delete().eq('User_ID', sub.User_ID)
            }
            return result
        })
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length
    console.log(`[PUSH] Admin push results: ${successCount}/${subs.length} sent`)
    return { success: successCount > 0 }
}

// ─────────────────────────────────────────────
// Notify: Driver New Job
// ─────────────────────────────────────────────
export async function notifyDriverNewJob(driverId: string, jobId: string, customerName: string) {
    await createNotification({
        Driver_ID: driverId,
        Title: '📦 งานใหม่สำหรับคุณ!',
        Message: `งาน ${jobId} • ลูกค้า: ${customerName}`,
        Type: 'info',
        Link: `/mobile/jobs/${jobId}`
    })

    await sendPushToDriver(driverId, {
        title: '📦 งานใหม่สำหรับคุณ!',
        body: `งาน ${jobId} • ลูกค้า: ${customerName}`,
        url: `/mobile/jobs/${jobId}`,
        type: 'new_job',
        tag: `new_job_${jobId}`,
    })
}

// ─────────────────────────────────────────────
// Notify: Driver sends Chat → Push to Admin
// ─────────────────────────────────────────────
export async function notifyAdminNewChat(driverId: string, driverName: string, message: string) {
    const isImage = message.startsWith('[IMAGE] ')
    await sendPushToAdmins({
        title: `💬 ${driverName || 'คนขับ'}`,
        body: isImage ? '📷 ส่งรูปภาพ' : message.slice(0, 120),
        url: `/chat?driver=${driverId}`,
        type: 'chat',
        tag: `chat_${driverId}`,
    })
}

// ─────────────────────────────────────────────
// Notify: Admin sends Chat → Push to Driver
// ─────────────────────────────────────────────
export async function notifyDriverNewChat(driverId: string, message: string) {
    const isImage = message.startsWith('[IMAGE] ')
    await sendPushToDriver(driverId, {
        title: '💬 ข้อความใหม่จากเจ้าหน้าที่',
        body: isImage ? '📷 ส่งรูปภาพ' : message.slice(0, 120),
        url: '/mobile/chat',
        type: 'chat',
        tag: `chat_admin`,
    })
}

// ─────────────────────────────────────────────
// Notify: Driver SOS → Push to All Admins
// ─────────────────────────────────────────────
export async function notifyAdminSOS(driverId: string, driverName: string, driverPhone?: string) {
    await sendPushToAdmins({
        title: `🆘 SOS! ${driverName || 'คนขับ'}`,
        body: `${driverName} กดปุ่มฉุกเฉิน — กดเพื่อดูตำแหน่งและโทรทันที`,
        url: `/monitoring?driver=${driverId}`,
        type: 'sos',
        tag: `sos_${driverId}`,
        driverPhone,
        actions: [
            { action: 'view_location', title: '📍 ดูตำแหน่ง' },
            { action: 'call_driver', title: '📞 โทรหาคนขับ' },
        ]
    })
}

// ─────────────────────────────────────────────
// Notify: Driver Job Status Update → Push to Admin
// ─────────────────────────────────────────────
export async function notifyAdminJobStatus(driverId: string, driverName: string, jobId: string, newStatus: string) {
    const statusEmoji: Record<string, string> = {
        'Picked Up': '📦',
        'In Transit': '🚛',
        'Delivered': '✅',
        'Completed': '✅',
        'Failed': '❌',
        'SOS': '🆘',
    }
    const emoji = statusEmoji[newStatus] || '🔔'

    await sendPushToAdmins({
        title: `${emoji} ${driverName} อัปเดตงาน`,
        body: `งาน ${jobId} → ${newStatus}`,
        url: `/planning?job=${jobId}`,
        type: 'status_update',
        tag: `status_${jobId}`,
    })
}

/**
 * Notify: Driver Silent SOS (No Call)
 * Sends alerts to admins with location and driver info.
 */
export async function notifySilentSOS(
    driverId: string, 
    driverName: string, 
    driverPhone?: string,
    lat?: number,
    lng?: number,
    address?: string
) {
    const locationStr = (lat && lng) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'ไม่ทราบพิกัด'
    const alertMessage = `🚨 ฉุกเฉิน! ${driverName} แจ้งเหตุ (ไม่สะดวกคุย)
📞 โทร: ${driverPhone || 'N/A'}
📍 พิกัด: ${locationStr}
🏠 ที่อยู่: ${address || 'N/A'}`

    // 1. Send Push to Admins (Optional, don't let failure stop us)
    try {
        await sendPushToAdmins({
            title: `🆘 SOS! ${driverName}`,
            body: alertMessage.slice(0, 200),
            url: `/monitoring?driver=${driverId}`,
            type: 'sos',
            tag: `sos_silent_${driverId}`,
            driverPhone,
            actions: [
                { action: 'view_location', title: '📍 ดูตำแหน่ง' },
                { action: 'call_driver', title: '📞 โทรกลับ' },
            ]
        })
    } catch (pushErr) {
        console.error("[SOS] Push failed (skipping):", pushErr)
    }

    // 2. Create Notification (CRITICAL - Use Admin Client to ensure it bypasses RLS)
    try {
        const supabase = await createAdminClient()
        await supabase
            .from('Notifications')
            .insert({
                Driver_ID: driverId,
                Title: `🆘 SOS: ${driverName}`,
                Message: alertMessage,
                Type: 'error',
                Link: `/monitoring?driver=${driverId}`,
                Created_At: new Date().toISOString()
            })
    } catch (dbErr) {
        console.error("[SOS] Database notification failed:", dbErr)
        // If this fails, we are in trouble, but let's try to log the activity anyway
    }

    // 3. Log Activity
    try {
        await logActivity({
            module: 'Jobs', 
            action_type: 'UPDATE',
            target_id: driverId,
            details: {
                alert_type: 'SILENT_SOS',
                driver_name: driverName,
                phone: driverPhone,
                lat,
                lng,
                address
            }
        })
    } catch (logErr) {
        console.error("[SOS] Log failed:", logErr)
    }

    return { success: true }
}
