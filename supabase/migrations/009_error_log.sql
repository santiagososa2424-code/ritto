-- Registro de errores.
--
-- Hasta ahora, cuando a un cliente le fallaba una exportación un martes, nos
-- enterábamos si el cliente escribía. Los errores iban a console.error, que en Vercel
-- se pierde a los pocos días y hay que ir a buscarlo a mano sabiendo qué buscar.
--
-- Esto es para enterarse antes que el cliente. No reemplaza los logs: guarda lo mínimo
-- para saber qué se rompió, a quién y cuándo.
--
-- Deliberadamente NO guarda el contenido de las facturas ni tokens: `contexto` es para
-- datos de forma —qué pestaña, cuántas facturas, qué código de estado— y nunca para el
-- documento del cliente ni credenciales.

create table if not exists error_log (
  id         uuid primary key default gen_random_uuid(),
  ocurrido   timestamptz not null default now(),
  -- Dónde se rompió: 'sheets/append', 'extract', etc.
  ambito     text not null,
  mensaje    text not null,
  stack      text,
  -- Puede ser null: hay errores que pasan antes de saber quién es el usuario.
  user_id    uuid references auth.users(id) on delete set null,
  contexto   jsonb
);

create index if not exists error_log_ocurrido_idx on error_log (ocurrido desc);

alter table error_log enable row level security;

-- Sin política de lectura a propósito: lo escribe y lo lee el servidor con service
-- role. Un cliente no tiene por qué ver los errores de otro, y un mensaje de error
-- puede filtrar detalles internos.
revoke select, insert, update, delete on public.error_log from authenticated, anon;
