-- ─────────────────────────────────────────────────────────────────
-- Driver_Payments — เพิ่มฟิลด์ปรับยอดตอนทำจ่าย (แอดมินเลือกก่อนยืนยัน)
--   VAT (ภาษีมูลค่าเพิ่ม, บวก) · WHT (หัก ณ ที่จ่าย, หัก) · Claim (ค่าเคลมสินค้า, หัก)
--
--   base    = Total_Amount (ค่าเที่ยว + extra)
--   net     = base + VAT_Amount − Withholding_Tax − Claim_Amount   (มาตรฐาน: คิดจาก base ทั้งหมด)
--   Net_Amount = ยอดที่โอนจริง → ใช้ทั้งใบสำคัญจ่าย + ไฟล์โอน SCB
--
-- รันเองใน Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

alter table "Driver_Payments"
    add column if not exists "VAT_Rate"        numeric(6,2)  default 0,   -- %
    add column if not exists "VAT_Amount"      numeric(14,2) default 0,
    add column if not exists "WHT_Rate"        numeric(6,2)  default 1,   -- % (มาตรฐานขนส่ง 1%)
    add column if not exists "Withholding_Tax" numeric(14,2) default 0,
    add column if not exists "Claim_Rate"      numeric(6,2)  default 0,   -- %
    add column if not exists "Claim_Amount"    numeric(14,2) default 0,
    add column if not exists "Net_Amount"      numeric(14,2);
