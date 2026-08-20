-- ─────────────────────────────────────────────────────────────────
-- TGO Freight Emission Factors — per vehicle type, kgCO2e per km
-- at rated full load (payload × tonne-km EF), normal road, diesel B7.
-- Source: TGO Emission Factor (CFP) Update 6, April 2026 — "Truck
-- Transportations". Makes the /settings/esg screen actually drive the
-- carbon calculation: edit a row here and the number the system uses
-- changes (code keeps hardcoded values only as a fallback if empty).
--
-- co2_per_km is the value actually used. payload_tonnes / ef_tkm are
-- kept for transparency / audit (co2_per_km = payload_tonnes × ef_tkm).
--
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

create table if not exists tgo_freight_factors (
    id              uuid primary key default gen_random_uuid(),
    vehicle_type    varchar(50) not null,          -- '4-Wheel' | '6-Wheel' | '10-Wheel' | 'Pickup' | 'default' ...
    payload_tonnes  numeric(10,3),                 -- rated payload used (ตัน)
    ef_tkm          numeric(10,4),                 -- TGO tonne-km EF at 100% loading
    co2_per_km      numeric(10,4) not null,        -- = payload_tonnes × ef_tkm (value used by the calc)
    mode            varchar(20) default 'normal',  -- 'normal' (วิ่งปกติ) | 'rough' (สมบุกสมบัน)
    effective_date  date not null default '2026-04-01',
    notes           text,
    is_active       boolean default true,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- One active row per vehicle type is what the calc looks up.
create unique index if not exists tgo_freight_vehicle_uidx
    on tgo_freight_factors (vehicle_type) where is_active;

-- Seed verified TGO April-2026 values (normal road, 100% loading, diesel B7).
insert into tgo_freight_factors (vehicle_type, payload_tonnes, ef_tkm, co2_per_km, mode, notes)
values
    ('4-Wheel',  1.5, 0.2153, 0.3230, 'normal', 'กระบะ 4 ล้อ · TGO CFP Update 6 เม.ย. 2026'),
    ('Pickup',   1.5, 0.2153, 0.3230, 'normal', 'กระบะ 4 ล้อ · TGO CFP Update 6 เม.ย. 2026'),
    ('6-Wheel',  11,  0.0613, 0.6743, 'normal', 'รถ 6 ล้อ ขนาดใหญ่ · TGO CFP Update 6 เม.ย. 2026'),
    ('10-Wheel', 16,  0.0454, 0.7264, 'normal', 'รถตู้ 10 ล้อ · TGO CFP Update 6 เม.ย. 2026')
on conflict do nothing;

alter table tgo_freight_factors enable row level security;
