"use client";

import { Job } from "@/lib/supabase/jobs";

export type DelayRisk = 'low' | 'medium' | 'high' | 'critical';

export interface PredictionResult {
    eta: Date;
    risk: DelayRisk;
    reason: string;
    confidence: number; // 0-100%
}

/**
 * AI Prediction Engine (Simulated Logic for TMS)
 * ในอนาคตสามารถเชื่อมต่อกับ Real-time Traffic API และ Weather API ได้
 */
export function predictJobDelay(job: Job, currentLat: number, currentLng: number, currentSpeed: number): PredictionResult {
    if (!job.Delivery_Lat || !job.Delivery_Lon || !job.Plan_Date) {
        return { eta: new Date(), risk: 'low', reason: 'Missing location data', confidence: 0 };
    }

    // 1. คำนวณระยะทางแบบเส้นตรง (Haversine Formula) - ขั้นต้น
    const R = 6371; // Earth radius in km
    const dLat = (job.Delivery_Lat - currentLat) * Math.PI / 180;
    const dLon = (job.Delivery_Lon - currentLng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(currentLat * Math.PI / 180) * Math.cos(job.Delivery_Lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c * 1.3; // คูณ 1.3 เพื่อชดเชยเส้นทางจริงที่ไม่ได้เป็นเส้นตรง

    // 2. คำนวณเวลาที่ใช้ (Travel Time Estimation)
    // ใช้ความเร็วเฉลี่ย 50 km/h หากความเร็วปัจจุบันต่ำเกินไป หรือใช้ความเร็วปัจจุบันถ้าสูงกว่า
    const avgSpeed = currentSpeed > 20 ? currentSpeed : 50;
    const hoursToDestination = distanceKm / avgSpeed;
    
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + (hoursToDestination * 60));

    // 3. วิเคราะห์ความเสี่ยง (Risk Assessment)
    // สมมติว่ามีตัวแปรภายนอก (ในระบบจริงจะดึงจาก Traffic/Weather API)
    const isRushHour = [8, 9, 16, 17, 18].includes(new Date().getHours());
    let riskFactor = 0;

    if (isRushHour) riskFactor += 30; // รถติดช่วงเร่งด่วน
    if (currentSpeed < 10 && distanceKm > 5) riskFactor += 40; // รถหยุดนิ่งทั้งที่ยังไม่ถึงจุดหมาย

    // เปรียบเทียบกับเวลานัดหมาย (Plan_Date มักจะเป็นวันที่ ดังนั้นต้องระบุเวลาจบงานที่ควรจะเป็นด้วย)
    // ในที่นี้สมมติว่าควรส่งเสร็จก่อน 17:00 ของวัน Plan_Date
    const deadline = new Date(job.Plan_Date);
    deadline.setHours(17, 0, 0);

    let risk: DelayRisk = 'low';
    let reason = 'On schedule';

    const diffMinutes = (eta.getTime() - deadline.getTime()) / (1000 * 60);

    if (diffMinutes > 60) {
        risk = 'critical';
        reason = 'Heavy traffic & Distance mismatch';
    } else if (diffMinutes > 30) {
        risk = 'high';
        reason = 'Expected delay due to current pace';
    } else if (diffMinutes > 0 || riskFactor > 50) {
        risk = 'medium';
        reason = 'Traffic congestion ahead';
    }

    return {
        eta,
        risk,
        reason,
        confidence: 85 // ระดับความแม่นยำพื้นฐาน
    };
}
