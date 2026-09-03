drop function public.marcar_entrada(uuid, text);

create function public.marcar_entrada(
  p_id uuid,
  p_usado_por text
)
returns table (
  resultado text,
  nombre_persona text,
  ingreso_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrada public.entradas;
  v_nombre text;
begin
  update public.entradas
     set usado = true,
         usado_at = now(),
         usado_por = left(p_usado_por, 120)
   where id = p_id and usado = false and anulada = false
  returning * into v_entrada;

  if found then
    select coalesce(v_entrada.nombre_persona, registro.nombre_pagador)
      into v_nombre
      from public.registros as registro
     where registro.id = v_entrada.registro_id;
    return query select 'admitido'::text, v_nombre, v_entrada.usado_at;
    return;
  end if;

  select * into v_entrada from public.entradas where id = p_id;
  if not found then
    return query select 'no_existe'::text, null::text, null::timestamptz;
    return;
  end if;

  select coalesce(v_entrada.nombre_persona, registro.nombre_pagador)
    into v_nombre
    from public.registros as registro
   where registro.id = v_entrada.registro_id;

  if v_entrada.anulada then
    return query select 'anulada'::text, v_nombre, null::timestamptz;
  else
    return query select 'ya_usado'::text, v_nombre, v_entrada.usado_at;
  end if;
end;
$$;

revoke all on function public.marcar_entrada(uuid, text)
  from public, anon, authenticated;
grant execute on function public.marcar_entrada(uuid, text)
  to service_role;
