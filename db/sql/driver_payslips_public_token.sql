-- =====================================================================
-- ลิงก์สาธารณะสำหรับใบสรุปจ่ายรถ (เปิดจาก Flex card ในไลน์โดยไม่ต้องล็อกอิน)
-- token สุ่มยาว เดาไม่ได้ = "unlisted" มีลิงก์เป๊ะเท่านั้นถึงเปิดได้
-- รันไฟล์นี้เองใน Supabase
-- =====================================================================

alter table public."Driver_Payslips"
  add column if not exists public_token text;

-- backfill ของเดิมให้มี token
update public."Driver_Payslips"
  set public_token = (gen_random_uuid())::text
  where public_token is null;

-- ของใหม่ gen อัตโนมัติ
alter table public."Driver_Payslips"
  alter column public_token set default (gen_random_uuid())::text;

create unique index if not exists uq_driver_payslips_public_token
  on public."Driver_Payslips" (public_token);
