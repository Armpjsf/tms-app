-- ─────────────────────────────────────────────────────────────────
-- Master_Users: second LINE user id so an admin can link BOTH Official
-- Accounts (dual-bot). A LINE userId is unique PER OA, so bot 1 and bot 2
-- give the same person different ids — one column can't hold both.
--   Line_User_ID   = userId under bot 1
--   Line_User_ID_2 = userId under bot 2
-- The completion notifier sends via whichever bot is active and falls back to
-- the other, exactly like customers (Master_Customers.Line_User_ID_2).
--
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

alter table "Master_Users" add column if not exists "Line_User_ID_2" text;
