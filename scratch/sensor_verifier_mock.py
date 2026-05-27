# -*- coding: utf-8 -*-
import math
import time
import json
from typing import List, Dict

# =========================================================================
# LOGIS-PRO TMS: Stair Incentive Verification Engine (Mock Simulation)
# สคริปต์จำลองการคำนวณและประเมินผลลัพธ์เพื่อจับทุจริตคนขับ
# =========================================================================

def estimate_altitude(pressure_hpa: float) -> float:
    """
    คำนวณความสูง (เมตร) จากค่าความกดอากาศ (hPa) โดยอ้างอิงสูตร Barometric Formula
    """
    # ระดับความสูงมาตรฐานเฉลี่ยระดับน้ำทะเล
    return 44330.0 * (1.0 - (pressure_hpa / 1013.25) ** 0.190294957)

def verify_stair_climbing(sensor_logs: List[Dict]) -> Dict:
    """
    ตรรกะการประเมินผลความถูกต้องของการส่งของขึ้นชั้น 2-3 (Incentive Verification Logic)
    
    อินพุต: list ของ dictionary ของ log ที่แอปบันทึกเป็นระยะ (เช่น ทุก 20 วินาที)
    [
      {"timestamp": 1716800000, "pressure": 1013.2, "steps_upward": 0},
      {"timestamp": 1716800020, "pressure": 1012.8, "steps_upward": 12},
      ...
    ]
    """
    if not sensor_logs or len(sensor_logs) < 2:
        return {
            "status": "Suspect",
            "reason": "No sensor history or interval logs are missing",
            "max_elevation_diff": 0.0,
            "total_steps_up": 0
        }
        
    # แปลงค่าความกดอากาศแต่ละจุดเป็นระดับความสูง
    altitudes = [estimate_altitude(log["pressure"]) for log in sensor_logs]
    steps = [log.get("steps_upward", 0) for log in sensor_logs]
    
    base_altitude = altitudes[0] # จุดจอดรถ / ระดับดินตอนกดเริ่ม
    max_altitude = max(altitudes) # จุดสูงสุดที่คนขับปีนขึ้นไปได้
    
    # 1. คำนวณความสูงสูงสุดที่พิชิตได้
    elevation_diff = max_altitude - base_altitude
    
    # 2. คำนวณผลรวมก้าวเดินขึ้นบันไดสะสม
    total_steps_up = max(steps) - min(steps)
    
    # กำหนดเกณฑ์ขั้นต่ำ (Threshold) สำหรับอนุมัติเงินพิเศษ
    # ชั้น 2-3 ทั่วไปควรสูงขึ้นอย่างน้อย 2.8 เมตรขึ้นไป และเดินขึ้นบันไดไม่น้อยกว่า 15 ก้าว
    MIN_ELEVATION_METERS = 2.8 
    MIN_STEPS = 15
    
    is_elevation_passed = elevation_diff >= MIN_ELEVATION_METERS
    is_steps_passed = total_steps_up >= MIN_STEPS
    
    # ตัดสินผลลัพธ์
    if is_elevation_passed or is_steps_passed:
        status = "Verified"
        reason = f"Verified: Found Max elevation diff of {elevation_diff:.2f} meters and steps climbed: {total_steps_up}"
    else:
        status = "Suspect"
        reason = f"Suspect (Fraud Alert): Max elevation diff was only {elevation_diff:.2f} meters (Required: {MIN_ELEVATION_METERS}m) and steps climbed: {total_steps_up} (Required: {MIN_STEPS} steps)"
        
    return {
        "status": status,
        "reason": reason,
        "max_elevation_diff": round(elevation_diff, 2),
        "total_steps_up": total_steps_up
    }

# =========================================================================
# TEST CASES (จำลองสถานการณ์หน้างานจริง)
# =========================================================================

# สถานการณ์ที่ 1: คนขับเดินขึ้นชั้น 3 จริง (ความดันลดลงชั่วขณะ แล้วเดินลงมาปิดงานที่เดิม)
climbing_logs_real = [
    {"timestamp": 1, "pressure": 1013.25, "steps_upward": 0},   # จอดรถ
    {"timestamp": 2, "pressure": 1012.90, "steps_upward": 10},  # ขึ้นชั้น 2
    {"timestamp": 3, "pressure": 1012.50, "steps_upward": 28},  # ถึงชั้น 3 (จุดสูงสุด)
    {"timestamp": 4, "pressure": 1012.50, "steps_upward": 28},  # วางของ & คุยกับลูกค้า
    {"timestamp": 5, "pressure": 1012.90, "steps_upward": 28},  # เดินกลับลงมา
    {"timestamp": 6, "pressure": 1013.25, "steps_upward": 28}   # ถึงรถ กดปิดงานส่งของ
]

# สถานการณ์ที่ 2: คนขับทุจริต (อ้างว่าขึ้นชั้น 3 แต่นั่งส่งของและปิดงานราบที่ชั้น 1 ตลอดเวลา)
fraud_logs = [
    {"timestamp": 1, "pressure": 1013.25, "steps_upward": 0},   # จอดรถ
    {"timestamp": 2, "pressure": 1013.24, "steps_upward": 2},   # เดินส่งของชั้น 1
    {"timestamp": 3, "pressure": 1013.25, "steps_upward": 3},   # ส่งของเสร็จ
    {"timestamp": 4, "pressure": 1013.25, "steps_upward": 3}    # กดปิดงาน
]

if __name__ == "__main__":
    print("--- [TEST CASE 1] REAL CLIMBING TO 3RD FLOOR ---")
    result_real = verify_stair_climbing(climbing_logs_real)
    print(f"Result: {result_real['status']}")
    print(f"Details: {result_real['reason']}")
    print()
    
    print("--- [TEST CASE 2] FRAUD SUSPECT (LEVEL 1 SUBMISSION) ---")
    result_fraud = verify_stair_climbing(fraud_logs)
    print(f"Result: {result_fraud['status']}")
    print(f"Details: {result_fraud['reason']}")
