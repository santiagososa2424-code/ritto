-- Qué escribió Ritto, dónde y cuándo.
--
-- Hasta ahora no quedaba registro. Ritto escribe adentro de la planilla contable real de
-- un cliente y no hay deshacer: si escribe algo mal, no había forma de saber qué tocó ni
-- de reconstruirlo. Es el riesgo más grande que tiene el producto, y no es hipotético —
-- el motor de exportación ya se rompió cuatro veces.
--
-- Con esto se puede: mostrarle al cliente de qué comprobante salió el número de la fila
-- 47, auditar una exportación que salió rara, y más adelante deshacerla.
--
-- Guarda sólo lo que Ritto escribió, no la fila entera: lo que ya había en la planilla
-- es del usuario y no nos corresponde copiarlo.

create table if not exists export_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Puede quedar en null si la factura se borra: el registro de lo que se escribió en la
  -- planilla tiene que sobrevivir igual.
  invoice_id   uuid references invoices(id) on delete set null,
  -- Para poder encontrar la fila de nuevo aunque la factura ya no esté.
  nro_documento text,
  proveedor    text,

  sheet_id     text not null,
  pestana      text not null,
  fila         integer not null,
  -- Cómo entró: 'libre' (fila vacía), 'insertar' (se abrió una fila nueva),
  -- 'correr' (era la más vieja y se corrió la primera).
  modo         text,
  -- Columna → valor, sólo de lo que Ritto escribió.
  escrito      jsonb not null default '{}'::jsonb,

  creado       timestamptz not null default now()
);

create index if not exists export_log_user_idx on export_log (user_id, creado desc);
create index if not exists export_log_invoice_idx on export_log (invoice_id);

alter table export_log enable row level security;

-- El usuario puede leer lo suyo: es su auditoría. Lo escribe el servidor con service
-- role, después de confirmar que la fila entró en la planilla.
create policy "Usuarios ven sus propias exportaciones"
  on export_log for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.export_log from authenticated, anon;
