-- PCG 4WJ freight rate card (fuel-indexed): destination × diesel price band.
-- Source: PCG_4WJ 18-07-69.pdf (82 destinations × 18 diesel bands 29–46 บาท/ลิตร).
-- Used to auto-fill Price_Cust_Total for PCG jobs = rate of the FARTHEST drop
-- (the most expensive destination in the trip) at the day's diesel price band.
-- Re-run scripts/seed-pcg-rates.js after editing the source PDF/JSON.

create table if not exists "PCG_Rate_Card" (
  id          bigint generated always as identity primary key,
  seq         integer,
  name        text not null,          -- normalized full destination label
  amphoe      text,                   -- normalized อำเภอ (null for combined routes)
  province    text,                   -- normalized จังหวัด (null for combined routes)
  is_combo    boolean not null default false,
  rates       jsonb  not null,        -- { "29": 1133, "30": 1137, ... "46": 1203 }
  "Active_Status" text not null default 'Active',
  updated_at  timestamptz not null default now()
);

create index if not exists idx_pcg_rate_amphoe   on "PCG_Rate_Card" (amphoe);
create index if not exists idx_pcg_rate_province on "PCG_Rate_Card" (province);
