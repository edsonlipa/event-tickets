alter table public.evento
  add column yape_qr_url text
  check (yape_qr_url is null or yape_qr_url ~ '^/');

alter table public.registros
  add column nombres_personas jsonb not null default '[]'::jsonb
  check (jsonb_typeof(nombres_personas) = 'array');

drop function public.crear_registro(uuid, text, text, text, integer, jsonb);

create function public.crear_registro(
  p_id uuid,
  p_nombre_pagador text,
  p_celular text,
  p_email text,
  p_cantidad_personas integer,
  p_nombres_personas jsonb,
  p_comprobantes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento public.evento;
  v_reservadas integer;
begin
  if jsonb_typeof(p_nombres_personas) <> 'array'
     or jsonb_array_length(p_nombres_personas) <> p_cantidad_personas then
    raise exception 'Los nombres de las entradas no coinciden con la cantidad'
      using errcode = '22023';
  end if;

  select *
    into v_evento
    from public.evento
   limit 1
     for update;

  if not found then
    raise exception 'El evento aún no está configurado' using errcode = 'P0001';
  end if;

  if v_evento.aforo_maximo is not null then
    select
      count(*) filter (where not anulada)
      + coalesce((
        select sum(cantidad_personas)
          from public.registros
         where status = 'pendiente'
           and created_at >= now() - interval '15 minutes'
      ), 0)
      into v_reservadas
      from public.entradas;

    if v_reservadas + p_cantidad_personas > v_evento.aforo_maximo then
      raise exception 'El aforo disponible no alcanza para esta compra'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.registros (
    id,
    nombre_pagador,
    celular,
    email,
    cantidad_personas,
    nombres_personas,
    precio_unitario
  )
  values (
    p_id,
    p_nombre_pagador,
    p_celular,
    lower(p_email),
    p_cantidad_personas,
    p_nombres_personas,
    v_evento.precio_unitario
  );

  insert into public.comprobantes (registro_id, storage_path, codigo_operacion, monto)
  select
    p_id,
    item.storage_path,
    nullif(item.codigo_operacion, ''),
    item.monto
  from jsonb_to_recordset(p_comprobantes) as item(
    storage_path text,
    codigo_operacion text,
    monto numeric(10, 2)
  );

  return p_id;
end;
$$;

revoke all on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb)
  to service_role;

create function public.consumir_rate_limit(
  p_alcance text,
  p_clave_hash text,
  p_limite integer,
  p_ventana interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumidos integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_alcance || ':' || p_clave_hash, 0));

  select count(*)
    into v_consumidos
    from public.rate_limit_eventos
   where alcance = p_alcance
     and clave_hash = p_clave_hash
     and created_at >= now() - p_ventana;

  if v_consumidos >= p_limite then
    return false;
  end if;

  insert into public.rate_limit_eventos (alcance, clave_hash)
  values (p_alcance, p_clave_hash);

  return true;
end;
$$;

revoke all on function public.consumir_rate_limit(text, text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.consumir_rate_limit(text, text, integer, interval)
  to service_role;
