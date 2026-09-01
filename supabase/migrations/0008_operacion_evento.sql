alter table public.entradas
  add column anulada_at timestamptz,
  add column anulada_por uuid references auth.users(id);

create function public.ajustar_cantidad_pagada(
  p_id uuid,
  p_cantidad integer,
  p_admin_id uuid
)
returns table (
  cantidad_anterior integer,
  cantidad_actual integer,
  creadas integer,
  anuladas integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro public.registros;
  v_evento public.evento;
  v_activas integer;
  v_usadas integer;
  v_delta integer;
  v_reservadas integer;
begin
  if p_cantidad < 1 or p_cantidad > 20 then
    raise exception 'La cantidad debe estar entre 1 y 20' using errcode = '22023';
  end if;

  select * into v_registro
    from public.registros
   where id = p_id
   for update;

  if not found or v_registro.status <> 'pagado' then
    raise exception 'Solo se puede ajustar una compra pagada' using errcode = 'P0001';
  end if;

  select * into v_evento from public.evento limit 1 for update;
  select count(*), count(*) filter (where usado)
    into v_activas, v_usadas
    from public.entradas
   where registro_id = p_id and not anulada;

  if p_cantidad < v_usadas then
    raise exception 'La cantidad no puede ser menor que las entradas ya usadas'
      using errcode = 'P0001';
  end if;

  v_delta := p_cantidad - v_activas;
  if v_delta > 0 and v_evento.aforo_maximo is not null then
    select count(*) filter (where not anulada)
      + coalesce((select sum(cantidad_personas) from public.registros
                   where status = 'pendiente' and created_at >= now() - interval '15 minutes'), 0)
      into v_reservadas
      from public.entradas;
    if v_reservadas + v_delta > v_evento.aforo_maximo then
      raise exception 'El aforo disponible no alcanza para el ajuste' using errcode = 'P0001';
    end if;
  end if;

  if v_delta > 0 then
    insert into public.entradas (registro_id, nombre_persona)
    select p_id, null from generate_series(1, v_delta);
  elsif v_delta < 0 then
    with candidatas as (
      select id
        from public.entradas
       where registro_id = p_id and not anulada and not usado
       order by (nombre_persona is not null), created_at desc, id
       limit -v_delta
       for update
    )
    update public.entradas as entrada
       set anulada = true,
           anulada_at = now(),
           anulada_por = p_admin_id
      from candidatas
     where entrada.id = candidatas.id;
    if not found then
      raise exception 'No hay entradas disponibles para anular' using errcode = 'P0001';
    end if;
  end if;

  update public.registros
     set cantidad_personas = p_cantidad,
         email_enviado = case when v_delta <> 0 then false else email_enviado end,
         email_enviado_at = case when v_delta <> 0 then null else email_enviado_at end,
         email_error = case when v_delta <> 0 then null else email_error end,
         email_intento_at = case when v_delta <> 0 then null else email_intento_at end
   where id = p_id;

  return query select v_activas, p_cantidad, greatest(v_delta, 0), greatest(-v_delta, 0);
end;
$$;

revoke all on function public.ajustar_cantidad_pagada(uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.ajustar_cantidad_pagada(uuid, integer, uuid)
  to service_role;
