-- Permisos por columna sobre `profiles`.
--
-- El RLS ya impide que un usuario toque la fila de otro, pero no dice NADA sobre qué
-- columnas puede tocar de la suya. Y en su propia fila viven `plan`,
-- `subscription_status` y `trial_ends_at`: con su sesión y una línea en la consola del
-- navegador, cualquiera se ponía subscription_status en 'active' y usaba el producto
-- sin pagar. RLS y permisos de columna resuelven cosas distintas y hacen falta los dos.
--
-- REQUISITO: correr esto DESPUÉS de desplegar el código que mueve el alta al servidor
-- (/api/profile/bootstrap). Si se corre antes, el registro deja de funcionar.
--
-- En Postgres un permiso a nivel de tabla pisa a los de columna, así que primero se
-- quita el general y recién después se otorgan las columnas una por una.

do $$
declare
  escribibles text;
  legibles text;
begin
  -- Todo lo que el usuario sí puede editar de su perfil: sus datos y sus preferencias.
  select string_agg(quote_ident(column_name), ', ')
    into escribibles
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'profiles'
     and column_name not in (
       'id',                        -- la clave: no se cambia
       'plan',                      -- lo decide el pago
       'subscription_status',       -- lo decide el pago
       'trial_ends_at',             -- lo fija el servidor al crear la cuenta
       'organization_id',           -- lo decide el dueño de la organización
       'role',                      -- idem
       'mp_subscription_id',        -- lo escribe el webhook de pagos
       'google_access_token',       -- credenciales: sólo el servidor
       'google_refresh_token',
       'google_token_expires_at',
       'google_email',
       'created_at'
     );

  -- Lo que puede leer: todo menos las credenciales de Google. Aunque le roben la
  -- sesión, los tokens no salen por la API.
  select string_agg(quote_ident(column_name), ', ')
    into legibles
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'profiles'
     and column_name not in ('google_access_token', 'google_refresh_token');

  execute 'revoke insert, update, select on public.profiles from authenticated, anon';

  -- El alta la hace el servidor con la service role, que no pasa por estos permisos,
  -- así que al cliente no le hace falta INSERT.
  execute format('grant update (%s) on public.profiles to authenticated', escribibles);
  execute format('grant select (%s) on public.profiles to authenticated', legibles);
end $$;

-- La política de UPDATE no tenía `with check`: validaba qué filas se pueden tocar,
-- pero no con qué valores quedaban. Sin esto, nada impide intentar cambiar el `id`.
drop policy if exists "Usuarios actualizan su propio perfil" on public.profiles;
create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
