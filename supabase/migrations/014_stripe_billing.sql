-- Stripe customer + subscription ids on profiles

alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;

create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx on profiles(stripe_subscription_id);
