
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

async function debugPush() {
    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    
    console.log("Checking VAPID Keys...");
    console.log("Public Key defined:", !!VAPID_PUBLIC);
    console.log("Private Key defined:", !!VAPID_PRIVATE);

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        console.error("VAPID Keys are missing!");
        return;
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Get one web push subscription
    const { data: subs } = await supabase
        .from('Push_Subscriptions')
        .select('*')
        .neq('Keys_Auth', 'FCM')
        .limit(1);

    if (!subs || subs.length === 0) {
        console.error("No Web Push subscriptions found in DB to test.");
        return;
    }

    const sub = subs[0];
    console.log("Testing Push to Endpoint:", sub.Endpoint.slice(0, 50) + "...");

    webpush.setVapidDetails('mailto:admin@tms-epod.com', VAPID_PUBLIC, VAPID_PRIVATE);

    try {
        await webpush.sendNotification(
            { endpoint: sub.Endpoint, keys: { p256dh: sub.Keys_P256dh, auth: sub.Keys_Auth } },
            JSON.stringify({ title: 'Debug Test', body: 'This is a test message' })
        );
        console.log("✅ Push sent successfully!");
    } catch (err) {
        console.error("❌ Push failed:", err.message);
        if (err.statusCode) console.error("Status Code:", err.statusCode);
        console.error("Body:", err.body);
    }
}

debugPush();
