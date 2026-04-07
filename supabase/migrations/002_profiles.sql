-- Tabla de perfiles de usuario con datos de empresa
create table if not exists profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  nombre    text,
  empresa   text,
  rut       text,
  telefono  text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Usuarios ven su propio perfil"
  on profiles for select
  using (auth.uid() = id);

create policy "Usuarios insertan su propio perfil"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Usuarios actualizan su propio perfil"
  on profiles for update
  using (auth.uid() = id);
