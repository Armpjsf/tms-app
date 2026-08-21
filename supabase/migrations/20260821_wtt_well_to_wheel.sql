-- ─────────────────────────────────────────────────────────────────
-- WTT (Well-to-Tank) → Well-to-Wheel (WTW) support
-- ISO 14083 / GLEC: WTW = TTW (การเผาไหม้ในการวิ่ง) + WTT (ต้นน้ำของเชื้อเพลิง:
-- ขุด/กลั่น/ขนส่งน้ำมันก่อนถึงถังรถ). เดิมระบบคิดแค่ TTW.
--
-- เพิ่มคอลัมน์ WTT ให้ 2 ตารางที่ /settings/esg ใช้:
--   tgo_emission_factors.wtt_value  (kgCO2e/L)  — WTW = ef_value + wtt_value
--   tgo_freight_factors.wtt_per_km  (kgCO2e/km) — WTW = co2_per_km + wtt_per_km
--
-- ค่า seed: ดีเซลอ้างอิงสไลด์ e-Carbon Receipt (WTT ~0.60, สัดส่วน WTT/TTW ~0.235).
-- โค้ดมีค่า default ในตัว ถ้าคอลัมน์/แถวว่างก็ยังคำนวณ WTW ได้.
--
-- รันเองใน Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

-- 1) เชื้อเพลิง (per liter)
alter table tgo_emission_factors
    add column if not exists wtt_value numeric(10,4) not null default 0;

update tgo_emission_factors set wtt_value = 0.60
    where fuel_code = 'Diesel_B7' and (wtt_value is null or wtt_value = 0);
update tgo_emission_factors set wtt_value = 0.49
    where fuel_code = 'Gasoline_E10' and (wtt_value is null or wtt_value = 0);

-- 2) ขนส่งต่อชนิดรถ (per km)
alter table tgo_freight_factors
    add column if not exists wtt_per_km numeric(10,4) not null default 0;

update tgo_freight_factors set wtt_per_km = 0.0759 where vehicle_type in ('4-Wheel','Pickup') and (wtt_per_km is null or wtt_per_km = 0);
update tgo_freight_factors set wtt_per_km = 0.1585 where vehicle_type in ('6-Wheel','default') and (wtt_per_km is null or wtt_per_km = 0);
update tgo_freight_factors set wtt_per_km = 0.1707 where vehicle_type = '10-Wheel' and (wtt_per_km is null or wtt_per_km = 0);
