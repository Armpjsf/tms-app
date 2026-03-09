import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import * as admin from 'firebase-admin'
import { join } from 'path'
import { readFileSync } from 'fs'

export async function GET(req: NextRequest) {
    const report: Record<string, unknown> = {}

    // 1. Check env var
    const envVar = process.env.FIREBASE_SERVICE_ACCOUNT
    report['1_firebase_env_var'] = envVar 
        ? `FOUND (length: ${envVar.length} chars)` 
        : 'MISSING'

    // 2. Try parse
    if (envVar) {
        try {
            const parsed = JSON.parse(envVar)
            report['2_json_parse'] = 'OK'
            report['2a_project_id'] = parsed.project_id || 'missing'
            report['2b_client_email'] = parsed.client_email || 'missing'
            report['2c_private_key_starts'] = parsed.private_key 
                ? parsed.private_key.substring(0, 50) + '...'
                : 'MISSING'
        } catch (e) {
            report['2_json_parse'] = 'FAILED: ' + String(e)
        }
    }

    // 3. Firebase init status
    report['3_firebase_apps_count'] = admin.apps.length
    if (admin.apps.length > 0) {
        report['3a_firebase_status'] = 'Initialized'
    } else {
        // Try init now
        try {
            let serviceAccount: admin.ServiceAccount
            if (envVar) {
                serviceAccount = JSON.parse(envVar) as admin.ServiceAccount
            } else {
                const path = join(process.cwd(), 'service_account.json')
                serviceAccount = JSON.parse(readFileSync(path, 'utf8')) as admin.ServiceAccount
            }
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
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
