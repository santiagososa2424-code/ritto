-- La columna que hacía falta para que una factura exportada quede marcada.
--
-- El código la venía escribiendo desde hace semanas y la base no la tenía, así que el
-- update fallaba siempre y en silencio. Las consecuencias fueron dos, y las dos se
-- reportaron sin que nadie sospechara que eran la misma cosa:
--
--   1. Al refrescar, las facturas archivadas volvían a aparecer como recién leídas.
--   2. La factura nunca salía de la lista, así que volver a exportar la escribía de
--      nuevo. Ocho clics, ocho filas repetidas en la contabilidad del cliente.
--
-- `warning` estaba en el mismo caso: el código lo lee al cargar y nunca existió, así que
-- el aviso de "revisar esta factura" se perdía al refrescar.

alter table invoices
  add column if not exists exported_at timestamptz,
  add column if not exists warning     text;

-- Para la vista de archivadas, que filtra por esta columna.
create index if not exists invoices_exported_at_idx on invoices (user_id, exported_at);

-- Sin política de UPDATE a propósito: la marca la pone el servidor con service role,
-- después de confirmar que la fila entró en la planilla. Si pudiera ponerla el
-- navegador, una factura podría figurar como exportada sin estarlo.
revoke update on public.invoices from authenticated, anon;
