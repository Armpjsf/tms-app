-- ─────────────────────────────────────────────────────────────────
-- Customer LINE Contacts — multiple LINE recipients per customer
-- Supports BOTH:
--   A) a LINE GROUP (Target_Type='group', Line_Target_ID = groupId "C...")
--      → one push reaches the whole team, cheapest on the 300/mo quota.
--   B) INDIVIDUAL team members (Target_Type='user', Line_Target_ID = "U...")
--      → private per-person push; costs one message each.
--
-- The legacy Master_Customers.Line_User_ID / Line_User_ID_2 columns stay as-is
-- for backward compatibility; this table is additive. On completion the notifier
-- pushes to the legacy id(s) PLUS every active row here, de-duplicated.
--
-- Bot_Index records which Official Account the id was linked through (a group /
-- user is only reachable by the OA it added), so pushes go out on the right bot.
--
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

create table if not exists "Customer_Line_Contacts" (
  id             uuid primary key default gen_random_uuid(),
  "Customer_ID"  text not null,
  "Line_Target_ID" text not null,               -- userId (U...) or groupId (C...)
  "Target_Type"  text not null default 'user'   -- 'user' | 'group'
                   check ("Target_Type" in ('user', 'group')),
  "Bot_Index"    smallint not null default 1
                   check ("Bot_Index" in (1, 2)),
  "Contact_Name" text,                           -- optional human label
  "Active"       boolean not null default true,
  created_at     timestamptz not null default now()
);

-- A given LINE id on a given bot can only belong to one contact row.
create unique index if not exists customer_line_contacts_target_bot_uidx
  on "Customer_Line_Contacts" ("Line_Target_ID", "Bot_Index");

-- Fast lookup by customer at send time.
create index if not exists customer_line_contacts_customer_idx
  on "Customer_Line_Contacts" ("Customer_ID");

-- RLS: server code uses the service-role (admin) client which bypasses RLS, so
-- keep RLS enabled with no public policy — the anon/auth keys get no access.
alter table "Customer_Line_Contacts" enable row level security;
