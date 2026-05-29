-- RIG Master Prompter v15.4.1 production schema.
-- Apply to managed Postgres with pgvector enabled before deploying the Vercel app.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists workspaces (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  email text not null,
  display_name text not null,
  sso_subject text,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists roles (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  key_hash text not null,
  label text not null,
  scopes jsonb not null default '[]'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists connector_credentials (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  connector_type text not null,
  encrypted_payload text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists context_sources (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete set null,
  type text not null,
  name text not null,
  location text not null,
  permissions text not null,
  status text not null,
  summary text not null default '',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists context_chunks (
  id text primary key,
  source_id text not null references context_sources(id) on delete cascade,
  title text not null,
  content text not null,
  content_hash text not null,
  citation text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists context_chunks_source_idx on context_chunks(source_id);
create index if not exists context_chunks_embedding_idx on context_chunks using ivfflat (embedding vector_cosine_ops);

create table if not exists prompt_runs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete set null,
  target_surface text not null,
  enhancements jsonb not null default '[]'::jsonb,
  coverage text not null,
  prompt text not null,
  prompt_hash text not null,
  fixed_prompt text not null,
  contract text not null,
  done_contract jsonb not null default '{}'::jsonb,
  score integer not null,
  selected_questions jsonb not null default '[]'::jsonb,
  gates jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  proof_packet_id text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  prompt_run_id text not null references prompt_runs(id) on delete cascade,
  adapter text not null,
  state text not null,
  steps jsonb not null default '[]'::jsonb,
  proof_packet_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approvals (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  agent_run_id text not null references agent_runs(id) on delete cascade,
  status text not null,
  required_for jsonb not null default '[]'::jsonb,
  reason text not null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists proof_packets (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  prompt_run_id text references prompt_runs(id) on delete set null,
  agent_run_id text references agent_runs(id) on delete set null,
  title text not null,
  status text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  actor text not null,
  action text not null,
  target text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_idx on audit_events(created_at desc);
create index if not exists prompt_runs_workspace_idx on prompt_runs(workspace_id, created_at desc);
create index if not exists agent_runs_prompt_idx on agent_runs(prompt_run_id, created_at desc);
create index if not exists approvals_status_idx on approvals(workspace_id, status, created_at desc);
