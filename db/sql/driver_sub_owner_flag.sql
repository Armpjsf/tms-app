-- =====================================================================
-- เจ้าของสังกัด (รถร่วม) เข้าดูใบสำคัญจ่ายของสังกัดผ่านบัญชีคนขับ
-- ทำเครื่องหมายคนขับ 1 คนต่อสังกัดเป็น "เจ้าของสังกัด"
--   → voucher จ่ายแบบ "รถร่วม" จะผูกเข้า Driver_ID ของคนนี้
--   → เขาเปิดแอป/พิมพ์ "สรุปจ่าย" ในไลน์ เห็น voucher สังกัด
-- รันไฟล์นี้เองใน Supabase
-- =====================================================================

alter table public."Master_Drivers"
  add column if not exists "Is_Sub_Owner" boolean not null default false;

-- ตัวอย่างการตั้งค่า (แก้ Driver_ID ให้ตรงคนที่เป็นเจ้าของสังกัด):
--   update public."Master_Drivers" set "Is_Sub_Owner" = true where "Driver_ID" = 'DRV-xxxxx';
-- ต้องแน่ใจว่าคนนั้นมี Sub_ID ตรงกับสังกัดของตัวเอง

-- ป้องกันตั้งเจ้าของซ้ำในสังกัดเดียว (1 สังกัด = 1 เจ้าของ)
create unique index if not exists uq_master_drivers_sub_owner
  on public."Master_Drivers" ("Sub_ID")
  where "Is_Sub_Owner" = true and "Sub_ID" is not null;
