-- =====================================================================
-- อัปเดต Driver_Payslips ให้รองรับ "ใบสำคัญจ่ายในระบบ" (kind='voucher')
-- รันไฟล์นี้ถ้าสร้างตารางจาก driver_payslips_schema.sql เวอร์ชันแรกไปแล้ว
-- =====================================================================

alter table public."Driver_Payslips"
  add column if not exists kind         text not null default 'excel',
  add column if not exists voucher_json jsonb,
  add column if not exists payment_id   text;

-- voucher ไม่มี grid_json -> ต้องอนุญาต null
alter table public."Driver_Payslips" alter column grid_json drop not null;

create unique index if not exists uq_driver_payslips_payment
  on public."Driver_Payslips" (payment_id) where payment_id is not null;

-- แจ้ง PostgREST ให้รีเฟรช schema cache
notify pgrst, 'reload schema';
