"use client";

import { DriverWithGPS } from "@/components/monitoring/monitoring-command-center";

export interface SafetyMetrics {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor';
    violations: string[];
}

/**
 * Driver Safety Scoring Engine
 * คำนวณคะแนนจากความเร็วและการใช้รถ
 */
export function calculateSafetyScore(driver: DriverWithGPS): SafetyMetrics {
    let score = 100;
    const violations: string[] = [];
    const speed = driver.Speed || 0;
    // 1. ตรวจสอบความเร็วเกินกำหนด (Speeding)
    // Convert m/s to km/h
    const speedKmH = speed * 3.6;

    if (speedKmH > 90) {
        score -= 30;
        violations.push(`Critical Speeding (${speedKmH.toFixed(1)} km/h)`);
    } else if (speedKmH > 80) {
        score -= 15;
        violations.push(`Minor Speeding (${speedKmH.toFixed(1)} km/h)`);
    }

    // 2. ตรวจสอบการขับขี่ต่อเนื่อง (Fatigue Risk - สมมติจากข้อมูล GPS)
    // ในระบบจริงจะนับจากเวลาที่เครื่องยนต์ทำงานต่อเนื่อง
    
    // 3. ตรวจสอบสถานะ Online/Offline (ความรับผิดชอบในการเปิดระบบ)
    if (!driver.Last_Update) {
        score -= 50;
        violations.push("System Offline");
    } else {
        const lastSeen = new Date(driver.Last_Update).getTime();
        const tenMins = 10 * 60 * 1000;
        if (Date.now() - lastSeen > tenMins) {
            score -= 20;
            violations.push("Connection Lag");
        }
    }

    // กำหนดสถานะตามคะแนน
    let status: SafetyMetrics['status'] = 'excellent';
    if (score < 50) status = 'poor';
    else if (score < 70) status = 'fair';
    else if (score < 90) status = 'good';

    return {
        score: Math.max(score, 0),
        status,
        violations
    };
}
