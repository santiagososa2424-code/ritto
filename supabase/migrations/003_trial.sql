-- Agregar columnas de plan y trial a profiles
alter table profiles
  add column if not exists plan text check (plan in ('pro', 'pyme', 'empresa')),
  add column if not exists subscription_status text default 'trial' check (subscription_status in ('trial', 'active', 'blocked')),
  add column if not exists trial_ends_at timestamptz;
