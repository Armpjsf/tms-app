-- ─────────────────────────────────────────────────────────────────
-- RAG / Semantic Search for the AI assistant
-- Dual vector space: Gemini (text-embedding-004) for the live web chat
-- on Vercel, nomic-embed-text (ollama) for local analysis scripts.
-- Both models output 768-dim vectors.
-- Run manually in Supabase SQL editor (project: uotofvfmlimkdmkcfsbr).
-- ─────────────────────────────────────────────────────────────────

create extension if not exists vector;

create table if not exists ai_embeddings (
  id           bigserial primary key,
  source_type  text not null,                 -- 'customer' | 'location' | 'job'
  source_id    text not null,
  content      text not null,                 -- the text that was embedded (human-readable)
  metadata     jsonb not null default '{}'::jsonb,
  branch_id    text,
  embedding_gemini vector(768),               -- for live web chat (Vercel)
  embedding_nomic  vector(768),               -- for local ollama scripts
  updated_at   timestamptz not null default now(),
  unique (source_type, source_id)
);

-- Cosine-distance ANN indexes (one per vector space)
create index if not exists ai_embeddings_gemini_idx
  on ai_embeddings using hnsw (embedding_gemini vector_cosine_ops);
create index if not exists ai_embeddings_nomic_idx
  on ai_embeddings using hnsw (embedding_nomic vector_cosine_ops);
create index if not exists ai_embeddings_type_idx   on ai_embeddings (source_type);
create index if not exists ai_embeddings_branch_idx on ai_embeddings (branch_id);

-- Service role bypasses RLS; enable it so nothing is exposed to anon.
alter table ai_embeddings enable row level security;

-- ── Match function: Gemini vector space ──────────────────────────
create or replace function match_ai_embeddings_gemini(
  query_embedding vector(768),
  match_count     int  default 5,
  filter_branch   text default null,
  filter_type     text default null
)
returns table (source_type text, source_id text, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select e.source_type, e.source_id, e.content, e.metadata,
         1 - (e.embedding_gemini <=> query_embedding) as similarity
  from ai_embeddings e
  where e.embedding_gemini is not null
    and (filter_branch is null or e.branch_id = filter_branch or e.branch_id is null)
    and (filter_type   is null or e.source_type = filter_type)
  order by e.embedding_gemini <=> query_embedding
  limit match_count;
$$;

-- ── Match function: nomic (ollama) vector space ──────────────────
create or replace function match_ai_embeddings_nomic(
  query_embedding vector(768),
  match_count     int  default 5,
  filter_branch   text default null,
  filter_type     text default null
)
returns table (source_type text, source_id text, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select e.source_type, e.source_id, e.content, e.metadata,
         1 - (e.embedding_nomic <=> query_embedding) as similarity
  from ai_embeddings e
  where e.embedding_nomic is not null
    and (filter_branch is null or e.branch_id = filter_branch or e.branch_id is null)
    and (filter_type   is null or e.source_type = filter_type)
  order by e.embedding_nomic <=> query_embedding
  limit match_count;
$$;
