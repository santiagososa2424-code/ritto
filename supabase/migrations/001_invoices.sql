-- Tabla de facturas procesadas por usuario
create table if not exists invoices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  file_name    text not null,
  source       text not null check (source in ('image', 'pdf', 'cfe_xml')),
  proveedor    text,
  rut          text,
  fecha        date,
  nro_documento text,
  tipo_documento text,
  moneda       text default 'UYU',
  neto         numeric(14, 2),
  iva10        numeric(14, 2),
  iva22        numeric(14, 2),
  iva_total    numeric(14, 2),
  total        numeric(14, 2),
  created_at   timestamptz default now()
);

-- Índices
create index if not exists invoices_user_id_idx on invoices(user_id);
create index if not exists invoices_created_at_idx on invoices(created_at desc);

-- Row Level Security: cada usuario solo ve sus facturas
alter table invoices enable row level security;

create policy "Usuarios ven sus propias facturas"
  on invoices for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propias facturas"
  on invoices for insert
  with check (auth.uid() = user_id);

create policy "Usuarios eliminan sus propias facturas"
  on invoices for delete
  using (auth.uid() = user_id);
