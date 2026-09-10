-- Memoria de a qué pestaña va cada proveedor.
--
-- Cuando una factura llega de un proveedor sin pestaña, Ritto le pregunta al usuario a
-- cuál mandarla. Sin esto le preguntaría de nuevo cada vez. Con esto pregunta una sola
-- vez por proveedor y después va sola.
--
-- La clave no es el nombre sino el RUT, porque el nombre cambia según cómo se lea la
-- factura: "MULTIVENTAS distribuciones", "Multiventas" o el nombre de la persona a
-- cargo pueden ser el mismo proveedor. El RUT son doce dígitos y no se mueve. Igual se
-- guarda una clave por nombre como respaldo, porque en una foto borrosa el RUT puede
-- no leerse.
--
-- Por eso `vendor_key` guarda el prefijo: 'rut:100333100014' o 'nombre:el trigal'.

create table if not exists vendor_mappings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  vendor_key  text not null,
  vendor_name text,
  sheet_name  text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, vendor_key)
);

create index if not exists vendor_mappings_user_idx on vendor_mappings (user_id);

alter table vendor_mappings enable row level security;

-- Sólo lectura para el usuario: alcanza para mostrarle sus reglas aprendidas. Las
-- escribe el servidor con service role, que no pasa por estas políticas — así el
-- cliente no puede inventarse reglas apuntando a pestañas de cualquier lado.
create policy "Usuarios ven sus propias reglas"
  on vendor_mappings for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.vendor_mappings from authenticated, anon;
