-- Root cause: โค้ดหลายจุด (plate matcher, sentinel, fuel/financial analytics,
-- vehicle form) select คอลัมน์ "Tank_Capacity" จาก Master_Vehicles แต่คอลัมน์นี้
-- ไม่เคยถูกสร้างใน DB จริง → ทุก query ที่มีคอลัมน์นี้ error → คืนรถ 0 คัน →
-- การจับคู่ทะเบียนบิลน้ำมัน (resolveFleetPlate) พังทั้งระบบ
-- แก้โดยเพิ่มคอลัมน์ให้ตรงกับที่โค้ดคาดหวัง (ความจุถังน้ำมัน หน่วยลิตร)
alter table "Master_Vehicles"
  add column if not exists "Tank_Capacity" numeric;
