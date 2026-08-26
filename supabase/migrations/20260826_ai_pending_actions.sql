-- Pending AI write-actions for the LINE bot confirm flow.
-- One row per LINE user; the row is popped (deleted) when the admin confirms.
create table if not exists public.ai_pending_actions (
  user_key    text primary key,
  action_name text not null,
  args        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Server uses the admin (service-role) client only; no public access.
alter table public.ai_pending_actions enable row level security;
