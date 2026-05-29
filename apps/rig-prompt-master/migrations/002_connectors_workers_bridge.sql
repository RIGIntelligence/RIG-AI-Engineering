-- RIG Master Prompter production connector, bridge, and worker schema.
-- Apply after 001_initial.sql on managed Postgres with pgvector enabled.

create table if not exists connector_installations (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete set null,
  connector_type text not null,
  display_name text not null,
  status text not null,
  safe_default text not null,
  required_env jsonb not null default '[]'::jsonb,
  location text not null,
  last_checked_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists connector_installations_workspace_idx
  on connector_installations(workspace_id, connector_type, status);

create table if not exists local_bridge_registrations (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  machine_name text not null,
  bridge_version text not null,
  lan_endpoint text,
  qnap_mount text,
  repo_root text,
  last_seen_at timestamptz,
  status text not null default 'offline',
  public_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists local_bridge_workspace_status_idx
  on local_bridge_registrations(workspace_id, status, last_seen_at desc);

create table if not exists worker_jobs (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  agent_run_id text not null references agent_runs(id) on delete cascade,
  adapter text not null,
  state text not null,
  locked_at timestamptz,
  proof_packet_id text references proof_packets(id) on delete set null,
  error text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worker_jobs_state_idx
  on worker_jobs(state, created_at asc);

create index if not exists worker_jobs_agent_run_idx
  on worker_jobs(agent_run_id);

create table if not exists proof_packet_artifacts (
  id text primary key,
  proof_packet_id text not null references proof_packets(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  uri text not null,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists proof_packet_artifacts_packet_idx
  on proof_packet_artifacts(proof_packet_id, artifact_type);

create or replace function match_context_chunks(
  query_embedding vector(1536),
  match_count int default 12,
  workspace_filter text default null
)
returns table (
  id text,
  source_id text,
  title text,
  content text,
  citation text,
  similarity double precision
)
language sql stable
as $$
  select
    cc.id,
    cc.source_id,
    cc.title,
    cc.content,
    cc.citation,
    1 - (cc.embedding <=> query_embedding) as similarity
  from context_chunks cc
  join context_sources cs on cs.id = cc.source_id
  where cc.embedding is not null
    and (workspace_filter is null or cs.workspace_id = workspace_filter)
  order by cc.embedding <=> query_embedding
  limit match_count;
$$;
