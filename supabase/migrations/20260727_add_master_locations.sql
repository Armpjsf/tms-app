-- =====================================================================
-- Phase 1: Normalize locations (ADDITIVE ONLY — ปลอดภัยต่อ production)
-- ---------------------------------------------------------------------
-- สร้างตาราง Master_Locations และเพิ่มคอลัมน์ Origin_ID/Dest_ID ใน
-- Master_Routes โดย "ไม่แตะ" คอลัมน์เดิม (Origin_Lat, Dest_Lat ฯลฯ)
-- แอปปัจจุบันยังอ่านคอลัมน์เดิมได้ตามปกติ ไม่มี error
--
-- วิธีรัน: เปิด Supabase > SQL Editor > วางทั้งไฟล์ > Run
-- (idempotent: รันซ้ำได้ ไม่พัง)
-- =====================================================================

create extension if not exists "pgcrypto";

-- 1) ตารางสถานที่หลัก -------------------------------------------------
create table if not exists public."Master_Locations" (
  "Location_ID" uuid primary key default gen_random_uuid(),
  "Name"        text not null,
  "Lat"         double precision,
  "Lon"         double precision,
  "Phone"       text,
  "Map_Link"    text,
  "Address"     text,
  "Branch_ID"   text,
  "Created_At"  timestamptz default now(),
  -- ชื่อเดียวกันภายในสาขาเดียวกัน = สถานที่เดียว
  constraint "Master_Locations_name_branch_key" unique ("Name", "Branch_ID")
);

create index if not exists idx_locations_branch on public."Master_Locations" ("Branch_ID");
create index if not exists idx_locations_name   on public."Master_Locations" ("Name");

-- 2) เพิ่ม FK columns ใน Master_Routes (nullable, ยังไม่บังคับ) --------
alter table public."Master_Routes"
  add column if not exists "Origin_ID" uuid
  references public."Master_Locations" ("Location_ID") on delete set null;

alter table public."Master_Routes"
  add column if not exists "Dest_ID" uuid
  references public."Master_Locations" ("Location_ID") on delete set null;

create index if not exists idx_routes_origin_id on public."Master_Routes" ("Origin_ID");
create index if not exists idx_routes_dest_id   on public."Master_Routes" ("Dest_ID");

-- 3) RLS: เปิด deny-by-default (เข้าถึงได้เฉพาะ service_role) ----------
--    ยังไม่ใส่ policy สำหรับ anon/authenticated เพราะแอปยังไม่อ่านตารางนี้
--    เมื่อถึงขั้นย้ายโค้ด ให้เพิ่ม policy เลียนแบบของ Master_Routes
--    (branch isolation) — ดู TODO ใน routes.ts
alter table public."Master_Locations" enable row level security;
