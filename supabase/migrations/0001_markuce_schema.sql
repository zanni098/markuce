-- ─────────────────────────────────────────────────────────────────────────────
-- Markuce — initial schema
-- Apply with: supabase db push  (local) or supabase migration up (remote)
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- ── Enum types ────────────────────────────────────────────────────────────────

create type network            as enum ('solana', 'polygon', 'ethereum', 'bitcoin_lightning');
create type payment_method_t   as enum ('card', 'usdc_solana', 'usdt_polygon', 'eth_ethereum', 'matic_polygon');
create type checkout_status    as enum ('awaiting_payment', 'confirming', 'confirmed', 'failed', 'expired');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type payout_status      as enum ('pending', 'processing', 'completed', 'failed');
create type payout_method_t    as enum ('usdc_solana', 'usdt_polygon', 'eth_ethereum', 'bank_wire');
create type kyc_status         as enum ('none', 'pending', 'approved', 'rejected');
create type billing_interval_t as enum ('day', 'week', 'month', 'year');
create type product_type_t     as enum ('one_time', 'subscription', 'usage');
create type delivery_status    as enum ('pending', 'delivered', 'failed');

-- ── profiles ──────────────────────────────────────────────────────────────────

create table profiles (
  id                    uuid        primary key references auth.users on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  business_name         text        not null default '',
  email                 text        not null default '',
  website               text,
  kyc_status            kyc_status  not null default 'none',
  kyc_provider_id       text,
  sol_wallet            text,
  polygon_wallet        text,
  eth_wallet            text,
  wise_account_id       text,
  default_payout_method payout_method_t not null default 'usdc_solana',
  stripe_account_id     text,
  onboarding_complete   boolean     not null default false,
  timezone              text        not null default 'UTC',
  currency              text        not null default 'USD'
);

alter table profiles enable row level security;

create policy "Merchant reads own profile"
  on profiles for select using (auth.uid() = id);

create policy "Merchant updates own profile"
  on profiles for update using (auth.uid() = id);

create policy "Merchant inserts own profile"
  on profiles for insert with check (auth.uid() = id);

-- ── merchant_secrets ──────────────────────────────────────────────────────────
-- Only accessible by the Edge Functions (service role). RLS denies all client reads.

create table merchant_secrets (
  merchant_id    uuid        primary key references profiles on delete cascade,
  pk_live        text        not null,
  sk_live        text        not null,
  sk_test        text        not null,
  webhook_secret text        not null,
  created_at     timestamptz not null default now(),
  rotated_at     timestamptz
);

alter table merchant_secrets enable row level security;

-- Edge functions use service_role — RLS only governs anon/authenticated
create policy "No client access to secrets"
  on merchant_secrets for all using (false);

-- ── products ──────────────────────────────────────────────────────────────────

create table products (
  id                     uuid            primary key default uuid_generate_v4(),
  merchant_id            uuid            not null references profiles on delete cascade,
  created_at             timestamptz     not null default now(),
  updated_at             timestamptz     not null default now(),
  name                   text            not null,
  description            text,
  price_minor            integer         not null check (price_minor >= 50),
  currency               text            not null default 'USD',
  type                   product_type_t  not null default 'one_time',
  billing_interval       billing_interval_t,
  billing_interval_count integer         not null default 1,
  trial_days             integer         not null default 0,
  active                 boolean         not null default true,
  image_url              text,
  metadata               jsonb           not null default '{}'
);

alter table products enable row level security;

create policy "Merchant reads own products"
  on products for select using (auth.uid() = merchant_id);

create policy "Merchant writes own products"
  on products for all using (auth.uid() = merchant_id);

-- Public read for checkout page (needs product details)
create policy "Public reads active products"
  on products for select using (active = true);

-- ── checkout_sessions ─────────────────────────────────────────────────────────

create table checkout_sessions (
  id                       uuid              primary key default uuid_generate_v4(),
  merchant_id              uuid              not null references profiles on delete cascade,
  product_id               uuid              not null references products,
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now(),
  expires_at               timestamptz       not null default (now() + interval '30 minutes'),
  status                   checkout_status   not null default 'awaiting_payment',
  -- Frozen price
  price_minor              integer           not null,
  currency                 text              not null default 'USD',
  payment_method           payment_method_t,
  -- Fiat
  stripe_payment_intent_id text,
  -- Crypto
  reference                text              not null unique default encode(gen_random_bytes(16), 'hex'),
  network                  network,
  crypto_address           text,
  crypto_amount            text,
  crypto_amount_quoted     text,
  -- Chainlink oracle snapshot
  chainlink_feed_address   text,
  chainlink_round_id       text,
  chainlink_price_usd      text,
  -- Customer
  customer_email           text,
  customer_name            text,
  -- Meta
  idempotency_key          text              unique,
  metadata                 jsonb             not null default '{}'
);

alter table checkout_sessions enable row level security;

create policy "Merchant reads own sessions"
  on checkout_sessions for select using (auth.uid() = merchant_id);

create policy "Public reads session by id (for checkout page)"
  on checkout_sessions for select using (true); -- Row access controlled by knowing the UUID

-- ── transactions ─────────────────────────────────────────────────────────────

create table transactions (
  id                   uuid             primary key default uuid_generate_v4(),
  merchant_id          uuid             not null references profiles on delete cascade,
  checkout_session_id  uuid             not null references checkout_sessions,
  created_at           timestamptz      not null default now(),
  net_minor            integer          not null,
  gross_minor          integer          not null,
  fee_minor            integer          not null,
  currency             text             not null default 'USD',
  payment_method       payment_method_t not null,
  network              network,
  tx_hash              text,
  stripe_charge_id     text,
  customer_email       text,
  refunded             boolean          not null default false,
  refunded_at          timestamptz
);

alter table transactions enable row level security;

create policy "Merchant reads own transactions"
  on transactions for select using (auth.uid() = merchant_id);

-- ── subscriptions ─────────────────────────────────────────────────────────────

create table subscriptions (
  id                       uuid                not null default uuid_generate_v4(),
  merchant_id              uuid                not null references profiles on delete cascade,
  product_id               uuid                not null references products,
  customer_email           text                not null,
  created_at               timestamptz         not null default now(),
  updated_at               timestamptz         not null default now(),
  status                   subscription_status not null default 'incomplete',
  current_period_start     timestamptz         not null,
  current_period_end       timestamptz         not null,
  stripe_subscription_id   text,
  trial_end                timestamptz,
  canceled_at              timestamptz,
  metadata                 jsonb               not null default '{}',
  primary key (id)
);

alter table subscriptions enable row level security;

create policy "Merchant reads own subscriptions"
  on subscriptions for select using (auth.uid() = merchant_id);

-- ── payouts ───────────────────────────────────────────────────────────────────

create table payouts (
  id                 uuid            primary key default uuid_generate_v4(),
  merchant_id        uuid            not null references profiles on delete cascade,
  created_at         timestamptz     not null default now(),
  updated_at         timestamptz     not null default now(),
  amount_minor       integer         not null,
  currency           text            not null default 'USD',
  method             payout_method_t not null,
  status             payout_status   not null default 'pending',
  tx_hash            text,
  destination_address text,
  wise_transfer_id   text,
  period_start       timestamptz     not null,
  period_end         timestamptz     not null,
  transaction_count  integer         not null default 0
);

alter table payouts enable row level security;

create policy "Merchant reads own payouts"
  on payouts for select using (auth.uid() = merchant_id);

-- ── webhooks ──────────────────────────────────────────────────────────────────

create table webhooks (
  merchant_id     uuid        primary key references profiles on delete cascade,
  url             text,
  enabled_events  text[]      not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table webhooks enable row level security;

create policy "Merchant manages own webhook"
  on webhooks for all using (auth.uid() = merchant_id);

-- ── webhook_deliveries ────────────────────────────────────────────────────────

create table webhook_deliveries (
  id               uuid            primary key default uuid_generate_v4(),
  merchant_id      uuid            not null references profiles on delete cascade,
  event_type       text            not null,
  payload          jsonb           not null,
  url              text            not null,
  status           delivery_status not null default 'pending',
  attempt_count    integer         not null default 0,
  last_attempt_at  timestamptz,
  next_retry_at    timestamptz,
  response_status  integer,
  created_at       timestamptz     not null default now()
);

alter table webhook_deliveries enable row level security;

create policy "Merchant reads own deliveries"
  on webhook_deliveries for select using (auth.uid() = merchant_id);

-- ── rate_limit_buckets ────────────────────────────────────────────────────────

create table rate_limit_buckets (
  key        text        primary key,
  tokens     numeric     not null,
  last_refill timestamptz not null default now()
);

-- Token bucket function (server-side rate limiting inside edge functions)
create or replace function rl_consume(
  p_key         text,
  p_capacity    numeric,
  p_refill_rate numeric,   -- tokens per second
  p_cost        numeric    -- tokens this request costs
) returns boolean as $$
declare
  bucket rate_limit_buckets;
  elapsed float;
  new_tokens numeric;
begin
  insert into rate_limit_buckets (key, tokens, last_refill)
  values (p_key, p_capacity, now())
  on conflict (key) do nothing;

  select * into bucket from rate_limit_buckets where key = p_key for update;

  elapsed    := extract(epoch from now() - bucket.last_refill);
  new_tokens := least(p_capacity, bucket.tokens + elapsed * p_refill_rate);

  if new_tokens < p_cost then
    return false;
  end if;

  update rate_limit_buckets
  set tokens = new_tokens - p_cost, last_refill = now()
  where key = p_key;

  return true;
end;
$$ language plpgsql;

-- ── Triggers — updated_at ─────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at           before update on profiles            for each row execute function set_updated_at();
create trigger set_products_updated_at           before update on products            for each row execute function set_updated_at();
create trigger set_checkout_sessions_updated_at  before update on checkout_sessions   for each row execute function set_updated_at();
create trigger set_subscriptions_updated_at      before update on subscriptions       for each row execute function set_updated_at();
create trigger set_payouts_updated_at            before update on payouts             for each row execute function set_updated_at();
create trigger set_webhooks_updated_at           before update on webhooks            for each row execute function set_updated_at();

-- ── pg_cron — expire old checkout sessions every 5 minutes ───────────────────

select cron.schedule(
  'expire-checkout-sessions',
  '*/5 * * * *',
  $$
    update checkout_sessions
    set status = 'expired'
    where status = 'awaiting_payment'
      and expires_at < now();
  $$
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index idx_products_merchant            on products             (merchant_id);
create index idx_checkout_sessions_merchant   on checkout_sessions    (merchant_id);
create index idx_checkout_sessions_reference  on checkout_sessions    (reference);
create index idx_checkout_sessions_status     on checkout_sessions    (status);
create index idx_transactions_merchant        on transactions         (merchant_id);
create index idx_transactions_created_at      on transactions         (merchant_id, created_at desc);
create index idx_subscriptions_merchant       on subscriptions        (merchant_id);
create index idx_payouts_merchant             on payouts              (merchant_id);
create index idx_webhook_deliveries_merchant  on webhook_deliveries   (merchant_id);
create index idx_webhook_deliveries_next_retry on webhook_deliveries  (next_retry_at) where status = 'pending';
