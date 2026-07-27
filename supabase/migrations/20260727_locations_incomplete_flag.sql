-- =====================================================================
-- ขั้น 3 foundation: flag สถานที่ที่ข้อมูลไม่ครบ (Is_Incomplete)
-- ---------------------------------------------------------------------
-- generated column: ระบบคำนวณเองว่าขาดพิกัด/ลิงก์ → true อัตโนมัติ
-- ไม่ต้องเขียน logic maintain, อัปเดตตามค่าจริงเสมอ
--
-- ใช้ตอน: งานเร่งด่วนพิมพ์เส้นทางใหม่เอง → สร้าง Master_Locations แบบยังไม่มีพิกัด
--          → Is_Incomplete = true อัตโนมัติ → หน้า /routes โชว์ + แจ้งเตือนแอดมิน
--          พอแอดมินเติมพิกัด+ลิงก์ครบ → Is_Incomplete กลับเป็น false เอง
--
-- idempotent: รันซ้ำได้
-- =====================================================================

alter table public."Master_Locations"
  add column if not exists "Is_Incomplete" boolean
  generated always as (
    "Lat" is null
    or "Lon" is null
    or "Map_Link" is null
    or btrim("Map_Link") = ''
  ) stored;

-- index เฉพาะแถวที่ไม่ครบ (partial) — ค้นหา "ที่ต้องเติม" เร็ว
create index if not exists idx_locations_incomplete
  on public."Master_Locations" ("Is_Incomplete")
  where "Is_Incomplete";
