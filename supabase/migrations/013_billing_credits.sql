-- Billing plans and credits (see billing.md)

alter table profiles add column if not exists billing_plan text not null default 'free';
alter table profiles add column if not exists credits_balance integer not null default 0;
alter table profiles add column if not exists credits_monthly_allowance integer not null default 0;
alter table profiles add column if not exists credits_period_start timestamptz;
alter table profiles add column if not exists credits_period_end timestamptz;

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  credits_delta integer not null,
  balance_after integer not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists credit_transactions_user_id_idx on credit_transactions(user_id);
create index if not exists credit_transactions_created_at_idx on credit_transactions(created_at desc);

alter table credit_transactions enable row level security;

create policy "credit_transactions owner select" on credit_transactions
  for select using (auth.uid() = user_id);
