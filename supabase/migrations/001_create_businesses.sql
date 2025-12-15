-- ===============================
-- TABLE: businesses
-- ===============================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,
  slug text not null,

  phone text,
  whatsapp text,

  is_active boolean not null default true,

  subscription_status text not null
    check (subscription_status in ('trial', 'active', 'lifetime_free', 'canceled')),

  trial_ends_at timestamptz,

  slot_interval_minutes integer not null default 30,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===============================
-- UNIQUE CONSTRAINTS
-- ===============================

-- Un usuario = un negocio
create unique index businesses_owner_id_key
on public.businesses (owner_id);

-- Slug único para URLs públicas
create unique index businesses_slug_key
on public.businesses (slug);

-- ===============================
-- UPDATED_AT AUTO
-- ===============================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_businesses_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();

-- ===============================
-- ROW LEVEL SECURITY
-- ===============================

alter table public.businesses enable row level security;

-- SELECT
create policy "Business owner can read"
on public.businesses
for select
using (auth.uid() = owner_id);

-- INSERT
create policy "Business owner can insert"
on public.businesses
for insert
with check (auth.uid() = owner_id);

-- UPDATE
create policy "Business owner can update"
on public.businesses
for update
using (auth.uid() = owner_id);
