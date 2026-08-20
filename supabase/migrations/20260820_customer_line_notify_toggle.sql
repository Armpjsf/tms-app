-- ─────────────────────────────────────────────────────────────────
-- Per-customer LINE notification switch. When true, job-completion LINE
-- pushes to this customer (and their team contacts) are suppressed — useful
-- for high-frequency customers who don't want a LINE per trip. In-app web
-- push and admin LINE are unaffected.
--
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

alter table "Master_Customers" add column if not exists "Line_Notify_Disabled" boolean not null default false;

-- Disable LINE notifications for Siam Rungruang by default as requested
update "Master_Customers"
set "Line_Notify_Disabled" = true
where "Customer_Name" ilike '%สยามรุ่งเรือง%' or "Customer_Name" ilike '%Siam Rungruang%';

