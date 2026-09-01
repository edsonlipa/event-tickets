create or replace function public.crear_registro(
  p_id uuid,
  p_nombre_pagador text,
  p_celular text,
  p_email text,
  p_cantidad_personas integer,
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
    precio_unitario
  )
  values (
    p_id,
    p_nombre_pagador,
    p_celular,
    lower(p_email),
    p_cantidad_personas,
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

revoke all on function public.crear_registro(uuid, text, text, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_registro(uuid, text, text, text, integer, jsonb)
  to service_role;
