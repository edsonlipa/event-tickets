-- US-019: correo de rechazo y liberación del código de operación.
--
-- El rechazo es del registro, no del comprobante. Un índice parcial no puede
-- consultar `registros.status` (Postgres prohíbe subconsultas en su predicado),
-- así que la unicidad se verifica dentro de `crear_registro`, que ya serializa
-- todas las creaciones con `select ... from evento for update` sobre la única
-- fila del evento. La verificación es tan atómica como el índice y, además,
-- puede preguntar por el estado.

alter table public.email_envios drop constraint email_envios_tipo_check;
alter table public.email_envios add constraint email_envios_tipo_check
  check (tipo in ('registro_recibido', 'entradas', 'rechazo'));

create or replace function public.crear_registro(
  p_id uuid, p_nombre_pagador text, p_celular text, p_email text,
  p_cantidad_personas integer, p_nombres_personas jsonb, p_comprobantes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento public.evento;
  v_reservadas integer;
  v_cantidad_pagos integer;
  v_total_pagos numeric(12, 2);
  v_codigo_repetido text;
begin
  if jsonb_typeof(p_nombres_personas) <> 'array' or jsonb_array_length(p_nombres_personas) <> p_cantidad_personas then
    raise exception 'Los nombres de las entradas no coinciden con la cantidad' using errcode = '22023';
  end if;
  if jsonb_typeof(p_comprobantes) <> 'array' then
    raise exception 'Los pagos no tienen un formato válido' using errcode = '22023';
  end if;
  select count(*), coalesce(sum(item.monto), 0)
    into v_cantidad_pagos, v_total_pagos
    from jsonb_to_recordset(p_comprobantes) as item(storage_path text, codigo_operacion text, monto numeric(10, 2))
   where length(trim(item.storage_path)) > 0 and item.codigo_operacion ~ '^[0-9]{8}$' and item.monto > 0;
  if v_cantidad_pagos = 0 or v_cantidad_pagos <> jsonb_array_length(p_comprobantes) then
    raise exception 'Cada pago requiere comprobante, código de 8 dígitos y monto' using errcode = '22023';
  end if;

  select * into v_evento from public.evento limit 1 for update;
  if not found then raise exception 'El evento aún no está configurado' using errcode = 'P0001'; end if;

  -- Unicidad del código de operación entre compras vivas. Un código usado en un
  -- registro rechazado vuelve a estar disponible: el pago Yape es real y el
  -- comprador debe poder reintentar con el mismo código. Se evalúa después del
  -- `for update` del evento, que serializa las creaciones concurrentes.
  select c.codigo_operacion into v_codigo_repetido
    from public.comprobantes c
    join public.registros r on r.id = c.registro_id
   where r.status <> 'rechazado'
     and c.codigo_operacion in (
       select item.codigo_operacion
         from jsonb_to_recordset(p_comprobantes) as item(storage_path text, codigo_operacion text, monto numeric(10, 2))
     )
   limit 1;
  if v_codigo_repetido is not null then
    raise exception 'El código de operación ya fue enviado (%)', v_codigo_repetido using errcode = '23505';
  end if;

  if v_total_pagos <> round(v_evento.precio_unitario * p_cantidad_personas, 2) then
    raise exception 'La suma de los pagos no coincide con el total de la compra' using errcode = '22023';
  end if;
  if v_evento.aforo_maximo is not null then
    select count(*) filter (where not anulada) + coalesce((select sum(cantidad_personas) from public.registros where status = 'pendiente' and created_at >= now() - interval '15 minutes'), 0)
      into v_reservadas from public.entradas;
    if v_reservadas + p_cantidad_personas > v_evento.aforo_maximo then
      raise exception 'El aforo disponible no alcanza para esta compra' using errcode = 'P0001';
    end if;
  end if;
  insert into public.registros (id, nombre_pagador, celular, email, cantidad_personas, nombres_personas, precio_unitario)
  values (p_id, p_nombre_pagador, p_celular, lower(p_email), p_cantidad_personas, p_nombres_personas, v_evento.precio_unitario);
  insert into public.comprobantes (registro_id, storage_path, codigo_operacion, monto)
  select p_id, item.storage_path, item.codigo_operacion, item.monto
    from jsonb_to_recordset(p_comprobantes) as item(storage_path text, codigo_operacion text, monto numeric(10, 2));
  return p_id;
end;
$$;

revoke all on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb) to service_role;

-- El índice global ya no describe la regla: un código de un registro rechazado
-- puede repetirse. La unicidad entre compras vivas la garantiza la función.
drop index if exists public.comprobantes_codigo_operacion_uniq;

-- Consultas del reintento de correo de rechazo y del filtro de duplicados.
create index if not exists email_envios_registro_tipo_idx
  on public.email_envios (registro_id, tipo, exito);

-- Cola de reintento del correo de rechazo.
--
-- Exige que exista un intento FALLIDO: el envío ocurre de forma síncrona al
-- rechazar, así que un registro sin ninguna fila `rechazo` es un rechazo
-- anterior a esta migración. Así los rechazos viejos nunca reciben un correo
-- sorpresa, sin necesidad de escribir filas falsas en la auditoría.
create or replace function public.rechazos_con_correo_pendiente(p_limite integer)
returns table (id uuid)
language sql
security definer
set search_path = public
as $$
  select r.id
    from public.registros r
   where r.status = 'rechazado'
     and exists (
       select 1 from public.email_envios e
        where e.registro_id = r.id and e.tipo = 'rechazo' and not e.exito)
     and not exists (
       select 1 from public.email_envios e
        where e.registro_id = r.id and e.tipo = 'rechazo' and e.exito)
   order by r.created_at
   limit p_limite;
$$;

revoke all on function public.rechazos_con_correo_pendiente(integer) from public, anon, authenticated;
grant execute on function public.rechazos_con_correo_pendiente(integer) to service_role;
