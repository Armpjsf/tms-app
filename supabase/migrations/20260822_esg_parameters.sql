-- ─────────────────────────────────────────────────────────────────
-- ESG global parameters (key–value) — พารามิเตอร์ ESG ระดับระบบที่แก้ผ่าน
-- หน้า /settings/esg ได้ (ไม่ผูกกับชนิดรถ/เชื้อเพลิง).
--
-- empty_return_ratio: สัดส่วนการปล่อยของเที่ยวกลับ (รถเปล่า) เทียบเที่ยวไป (เต็ม)
--   ตัวคูณการปล่อยไป-กลับ = 1 + empty_return_ratio
--   อ้างอิง DEFRA 2025 UK GHG Conversion Factors — all-HGV per-km:
--     0% laden = 0.660, 100% laden = 1.012 kgCO2e/km → 0.660/1.012 ≈ 0.65
--
-- โค้ดมีค่า default ในตัว (esg-utils.EMPTY_RETURN_RATIO) จึงยังคำนวณได้แม้ตารางว่าง.
-- รันเองใน Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

create table if not exists esg_parameters (
    param_key    varchar(64) primary key,
    param_value  numeric(12,4) not null,
    notes        text,
    updated_at   timestamptz default now()
);

insert into esg_parameters (param_key, param_value, notes)
values
    ('empty_return_ratio', 0.65, 'สัดส่วนปล่อยเที่ยวกลับรถเปล่า เทียบเที่ยวไปเต็ม · อ้างอิง DEFRA 2025 all-HGV (empty 0.660 / full 1.012 kgCO2e-km ≈ 0.65)'),
    ('tree_absorb_kg_per_year', 9.5, 'อัตราดูดซับ CO2 ของต้นไม้ 9.5 kgCO2/ต้น/ปี · อ้างอิง TGO/อบก. (LESS) — ต้นไม้ 1 ต้นกักเก็บคาร์บอนเพิ่มขึ้น ~9.5 kg/ปี')
on conflict (param_key) do nothing;

alter table esg_parameters enable row level security;
