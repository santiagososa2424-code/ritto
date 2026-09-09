-- Reemplaza a la 005, que no llegó a aplicarse: se verificó después y el rol
-- `authenticated` seguía con UPDATE sobre `subscription_status` y con SELECT sobre los
-- tokens de Google. Aquella usaba un bloque `do $$` que arma el SQL en tiempo de
-- ejecución; acá va cada columna escrita a mano, para que un error se vea.
--
-- Qué resuelve: el RLS impide tocar la fila de otro, pero no dice nada sobre qué
-- columnas se pueden tocar de la propia. En la propia viven `plan`,
-- `subscription_status` y `trial_ends_at`, así que cualquiera podía activarse un plan
-- pago desde la consola del navegador.
--
-- REQUISITO: correr esto DESPUÉS de desplegar el código que quita el upsert del
-- cliente (settings usa update, y el alta pasa por /api/profile/bootstrap).

-- Los permisos a nivel de tabla pisan a los de columna, así que primero van abajo.
revoke insert, update, select on public.profiles from authenticated, anon;

-- Lectura: todo menos las credenciales de Google. Aunque roben una sesión válida, los
-- tokens no salen por la API.
grant select (
  id, nombre, empresa, rut, telefono, created_at, updated_at, sistema_contable,
  organization_id, org_id, role, excel_mapping, onboarding_complete, google_sheet_id,
  google_token_expires_at, google_email, mp_subscription_id, subscription_status,
  plan, trial_ends_at, sheet_column_mapping
) on public.profiles to authenticated;

-- Escritura: sólo los datos y preferencias que el usuario edita de su perfil.
-- Quedan afuera a propósito:
--   plan, subscription_status, trial_ends_at  -> los decide el pago
--   organization_id, org_id, role             -> los decide el dueño de la organización
--   mp_subscription_id                        -> lo escribe el webhook
--   google_*                                  -> credenciales, sólo el servidor
--   google_sheet_id, sheet_column_mapping     -> se guardan por API con service role
--   id, created_at, updated_at                -> no se tocan
grant update (
  nombre, empresa, rut, telefono, sistema_contable, excel_mapping, onboarding_complete
) on public.profiles to authenticated;

-- INSERT no se devuelve: el perfil lo crea /api/profile/bootstrap con la service role,
-- que no pasa por estos permisos. Sin esto, alguien podía insertarse una fila con el
-- plan y el estado que quisiera.

-- La política de UPDATE no tenía `with check`: validaba qué filas se pueden tocar pero
-- no con qué valores quedan.
drop policy if exists "Usuarios actualizan su propio perfil" on public.profiles;
create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
