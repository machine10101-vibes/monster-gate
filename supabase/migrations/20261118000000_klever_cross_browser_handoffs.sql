create table if not exists public.klever_handoffs (
  id uuid primary key,
  poll_token_hash text not null check (poll_token_hash ~ '^[0-9a-f]{64}$'),
  nonce text unique,
  address text,
  status text not null default 'pending' check (status in ('pending','complete','consumed')),
  session jsonb,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint klever_handoffs_address_check check (address is null or address ~ '^klv1[02-9ac-hj-np-z]{58}$')
);
create index if not exists klever_handoffs_expiry_idx on public.klever_handoffs (expires_at);
alter table public.klever_handoffs enable row level security;
