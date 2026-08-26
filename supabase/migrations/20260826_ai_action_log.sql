-- Audit log for every AI/LINE write action, plus enough to undo the last one.
create table if not exists public.ai_action_log (
  id           bigint generated always as identity primary key,
  actor        text,                       -- username / LINE display name / user id
  channel      text,                       -- 'chat' | 'line'
  action_name  text not null,
  args         jsonb not null default '{}'::jsonb,
  success      boolean not null default false,
  result_ref   jsonb,                      -- { table, pk } for undo of create actions
  message      text,
  created_at   timestamptz not null default now()
);

alter table public.ai_action_log enable row level security;
create index if not exists idx_ai_action_log_actor_time
  on public.ai_action_log (actor, created_at desc);
