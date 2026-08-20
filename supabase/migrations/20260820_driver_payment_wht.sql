-- ─────────────────────────────────────────────────────────────────
-- Driver_Payments: persist withholding tax (WHT) and net amount so the
-- saved record matches what is shown on screen and transferred to the bank.
--   Total_Amount   = gross (base driver cost + driver-side extra costs)
--   Withholding_Tax = 1% WHT deducted
--   Net_Amount      = Total_Amount - Withholding_Tax (actual transfer amount)
-- Nullable + best-effort write, so payments keep working before this runs.
--
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

alter table "Driver_Payments" add column if not exists "Withholding_Tax" numeric(14,2);
alter table "Driver_Payments" add column if not exists "Net_Amount" numeric(14,2);
