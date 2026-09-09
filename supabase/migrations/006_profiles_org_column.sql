-- `profiles` tenía DOS columnas para lo mismo: `org_id` y `organization_id`.
--
-- Cada parte del código escribía en una distinta. El pago y la aceptación de una
-- invitación guardaban en `org_id`; el alta guardaba en `organization_id`; y la única
-- pantalla que muestra el equipo lee `organization_id`. Resultado: el que pagaba un
-- plan Pyme o Empresa quedaba con su organización en la columna que nadie lee, así que
-- para la aplicación nunca tuvo equipo. Como en el webhook eso pasaba dentro de un
-- catch vacío, no quedaba rastro en ningún lado.
--
-- Se unifica en `organization_id`, que es la que lee la interfaz.
--
-- REQUISITO: correr esto DESPUÉS de desplegar el código que unifica las escrituras.
-- Si se corre antes, los endpoints que todavía escriben `org_id` empiezan a fallar.
--
-- De paso cierra un hueco de la migración 005: ahí se le quitó a `authenticated` el
-- permiso de escribir `organization_id`, pero `org_id` no estaba en la lista de
-- exclusiones, así que quedó escribible. Al eliminar la columna, deja de importar.

do $$
declare
  conflictos int;
  migrados int;
begin
  -- Si alguna fila tiene las dos columnas con organizaciones distintas, no hay forma
  -- de saber cuál vale: mejor frenar que elegir mal y perder el dato.
  select count(*) into conflictos
    from public.profiles
   where org_id is not null
     and organization_id is not null
     and org_id <> organization_id;

  if conflictos > 0 then
    raise exception 'Hay % perfiles con org_id y organization_id distintos. Revisalos a mano antes de correr esto.', conflictos;
  end if;

  update public.profiles
     set organization_id = org_id
   where organization_id is null
     and org_id is not null;

  get diagnostics migrados = row_count;
  raise notice 'Perfiles vinculados a su organización: %', migrados;
end $$;

alter table public.profiles drop column if exists org_id;
