-- US-020: las compras nuevas usan imagen y monto; el código de operación queda
-- exclusivamente como dato histórico nullable.

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
begin
  if jsonb_typeof(p_nombres_personas) <> 'array' or jsonb_array_length(p_nombres_personas) <> p_cantidad_personas then
    raise exception 'Los nombres de las entradas no coinciden con la cantidad' using errcode = '22023';
  end if;
  if jsonb_typeof(p_comprobantes) <> 'array' then
    raise exception 'Los pagos no tienen un formato válido' using errcode = '22023';
  end if;

  -- `codigo_operacion` permanece en el recordset solo para aceptar el payload de
  -- pestañas antiguas. No se valida ni se inserta.
  select count(*), coalesce(sum(item.monto), 0)
    into v_cantidad_pagos, v_total_pagos
    from jsonb_to_recordset(p_comprobantes) as item(storage_path text, codigo_operacion text, monto numeric(10, 2))
   where length(trim(item.storage_path)) > 0 and item.monto > 0;
  if v_cantidad_pagos = 0 or v_cantidad_pagos <> jsonb_array_length(p_comprobantes) then
    raise exception 'Cada pago requiere comprobante y monto' using errcode = '22023';
  end if;

  select * into v_evento from public.evento limit 1 for update;
  if not found then raise exception 'El evento aún no está configurado' using errcode = 'P0001'; end if;

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
  select p_id, item.storage_path, null, item.monto
    from jsonb_to_recordset(p_comprobantes) as item(storage_path text, codigo_operacion text, monto numeric(10, 2));

  return p_id;
end;
$$;

revoke all on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crear_registro(uuid, text, text, text, integer, jsonb, jsonb) to service_role;
