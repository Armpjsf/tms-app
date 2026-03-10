import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import * as admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'

export async function GET(req: NextRequest) {
    const report: Record<string, unknown> = {}

    // 1. Check env vars
    const envBlob = process.env.FIREBASE_SERVICE_ACCOUNT
    const envProjectId = process.env.FIREBASE_PROJECT_ID
    const envEmail = process.env.FIREBASE_CLIENT_EMAIL
    const envKey = process.env.FIREBASE_PRIVATE_KEY

    report['1_firebase_env_blob'] = envBlob ? `FOUND (length: ${envBlob.length} chars)` : 'MISSING'
    report['1a_firebase_project_id'] = envProjectId ? `FOUND (${envProjectId})` : 'MISSING'
    report['1b_firebase_client_email'] = envEmail ? `FOUND (${envEmail})` : 'MISSING'
    report['1c_firebase_private_key'] = envKey ? `FOUND (length: ${envKey.length} chars, starts with: ${envKey.substring(0, 30)}...)` : 'MISSING'

    // 3. Firebase init status
    report['3_firebase_apps_count'] = admin.apps.length
    if (admin.apps.length > 0) {
        report['3a_firebase_status'] = 'Initialized'
    } else {
        // Try init now
        try {
            let credential: admin.credential.Credential
            if (envBlob) {
                // Initialize via JSON blob
                const sa = JSON.parse(envBlob) as admin.ServiceAccount
                credential = admin.credential.cert(sa)
            } else if (envProjectId && envEmail && envKey) {
                // Initialize via individual env vars
                // Robust sanitization: handle escaped newlines, literal quotes, and extra whitespace
                const privateKey = envKey
                    .replace(/\\n/g, '\n')
                    .replace(/"/g, '') // Remove literal quotes if present
                    .trim()
                
                // Diagnostic check for email/project mismatch
                if (!envEmail.includes(envProjectId)) {
                    console.warn(`[Firebase Debug] Logic Mismatch? Email: ${envEmail} vs Project: ${envProjectId}`)
                }

                credential = admin.credential.cert({
                    projectId: envProjectId,
                    clientEmail: envEmail,
                    privateKey,
                })
            } else {
                // Local dev fallback: read from file
                const path = join(process.cwd(), 'service_account.json')
                const sa = JSON.parse(readFileSync(path, 'utf8')) as admin.ServiceAccount
                credential = admin.credential.cert(sa)
            }
            admin.initializeApp({ credential })
            report['3a_firebase_status'] = 'Initialized OK (on demand)'
        } catch (e) {
            report['3a_firebase_status'] = 'INIT FAILED: ' + String(e)
        }
    }

    // 4. Check Push_Subscriptions table
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('Push_Subscriptions')
            .select('Driver_ID, Keys_Auth, Updated_At')
            .order('Updated_At', { ascending: false })
            .limit(10)

        if (error) {
            report['4_push_subscriptions'] = 'DB ERROR: ' + error.message
        } else {
            report['4_push_subscriptions_count'] = data?.length ?? 0
            report['4_subscriptions'] = data?.map(s => ({
                driver: s.Driver_ID,
                type: s.Keys_Auth === 'FCM' ? 'FCM (APK)' : 'WebPush (PWA)',
                updated: s.Updated_At
            }))
        }
    } catch (e) {
        report['4_push_subscriptions'] = 'ERROR: ' + String(e)
    }

    // 5. Test FCM send (optional: pass ?driverId=XXX in query)
    const testDriverId = req.nextUrl.searchParams.get('driverId')
    if (testDriverId && admin.apps.length > 0) {
        try {
            const supabase = await createClient()
            const { data: sub } = await supabase
                .from('Push_Subscriptions')
                .select('*')
                .eq('Driver_ID', testDriverId)
                .single()

            if (!sub) {
                report['5_test_send'] = `No subscription found for driver: ${testDriverId}`
            } else if (sub.Keys_Auth === 'FCM') {
                const result = await admin.messaging().send({
                    notification: { title: '🔔 Test Push', body: 'การทดสอบระบบ Push Notification' },
                    data: { url: '/mobile/jobs' },
                    token: sub.Endpoint
                })
                report['5_test_send'] = 'FCM SENT OK: ' + result
            } else {
                report['5_test_send'] = 'Subscription is WebPush type (not FCM) - cannot test here'
            }
        } catch (e) {
            report['5_test_send'] = 'SEND FAILED: ' + String(e)
        }
    } else if (testDriverId) {
        report['5_test_send'] = 'Firebase not initialized, cannot send'
    }

    return NextResponse.json(report, { status: 200 })
}
