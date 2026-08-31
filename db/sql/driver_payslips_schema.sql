-- =====================================================================
-- Driver Payslips (สลิป/ใบสรุปจ่ายรถ)
-- แอดมินอัปโหลดไฟล์ Excel รวม (1 sheet ต่อ 1 คนขับ) ระบบแยกเก็บเป็นสลิปรายคน
-- คนขับเปิดดูในแอปมือถือ + ดาวน์โหลด Excel (เฉพาะของตัวเอง) / PDF
-- รันไฟล์นี้เองใน Supabase SQL Editor
-- =====================================================================

create table if not exists public."Driver_Payslips" (
  id              uuid primary key default gen_random_uuid(),
  "Driver_ID"     text not null,
  driver_name     text,                     -- ชื่อคนขับ (snapshot ตอนอัป)
  sheet_name      text,                     -- ชื่อ sheet ต้นทางในไฟล์ Excel
  title           text not null,            -- หัวเรื่องสลิป เช่น "รถร่วม 1-15 ก.ค. 69 (มหาชัย)"
  period_label    text,                     -- งวด เช่น "1-15.7.69"
  branch_label    text,                     -- สาขา เช่น "มหาชัย"
  total_amount    numeric,                  -- ยอดรวม/คงเหลือ (ถ้าจับได้)
  kind            text not null default 'excel',  -- 'excel' = ไฟล์อัปโหลด, 'voucher' = ใบสำคัญจ่ายในระบบ
  grid_json       jsonb,                    -- โครงตารางสำหรับ render (เฉพาะ kind='excel')
  voucher_json    jsonb,                    -- ข้อมูลใบสำคัญจ่าย (เฉพาะ kind='voucher')
  payment_id      text,                     -- Driver_Payment_ID ต้นทาง (เฉพาะ voucher, ใช้กัน push ซ้ำ)
  xlsx_url        text,                     -- ไฟล์ Excel รายคน (สำหรับดาวน์โหลด)
  source_file     text,                     -- ชื่อไฟล์ต้นทางที่อัป
  batch_id        uuid,                     -- กลุ่มการอัปครั้งเดียวกัน
  uploaded_by     text,                     -- userId แอดมินที่อัป
  uploaded_at     timestamptz not null default now()
);

create index if not exists idx_driver_payslips_driver
  on public."Driver_Payslips" ("Driver_ID", uploaded_at desc);
create index if not exists idx_driver_payslips_batch
  on public."Driver_Payslips" (batch_id);
create unique index if not exists uq_driver_payslips_payment
  on public."Driver_Payslips" (payment_id) where payment_id is not null;

-- หมายเหตุ: ระบบเข้าถึงผ่าน service role (createAdminClient) เท่านั้น
-- เปิด RLS ไว้และไม่สร้าง policy สำหรับ anon/authenticated เพื่อกันการอ่านตรง
alter table public."Driver_Payslips" enable row level security;
