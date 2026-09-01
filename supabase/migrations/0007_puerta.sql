create function public.registrar_intento_pin(
  p_ip_hash text,
  p_exito boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ultimo_exito timestamptz;
  v_ultimo_fallo timestamptz;
  v_fallos integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('pin:' || p_ip_hash, 0));
  select max(created_at) into v_ultimo_exito
    from public.intentos_pin where ip_hash = p_ip_hash and exito;
  select count(*), max(created_at) into v_fallos, v_ultimo_fallo
    from public.intentos_pin
   where ip_hash = p_ip_hash
     and not exito
     and created_at >= greatest(now() - interval '15 minutes', coalesce(v_ultimo_exito, '-infinity'));

  if (v_fallos >= 8 and v_ultimo_fallo >= now() - interval '30 minutes')
     or (v_fallos >= 5 and v_ultimo_fallo >= now() - interval '5 minutes') then
    return 'bloqueado';
  end if;

  insert into public.intentos_pin (ip_hash, exito) values (p_ip_hash, p_exito);
  return case when p_exito then 'correcto' else 'incorrecto' end;
end;
$$;

revoke all on function public.registrar_intento_pin(text, boolean)
  from public, anon, authenticated;
grant execute on function public.registrar_intento_pin(text, boolean)
  to service_role;

create function public.marcar_entrada(
  p_id uuid,
  p_usado_por text
)
returns table (
  resultado text,
  nombre_persona text,
  usado_previamente_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrada public.entradas;
begin
  update public.entradas
     set usado = true,
         usado_at = now(),
         usado_por = left(p_usado_por, 120)
   where id = p_id and usado = false and anulada = false
  returning * into v_entrada;

  if found then
    return query select 'admitido'::text, v_entrada.nombre_persona, null::timestamptz;
    return;
  end if;

  select * into v_entrada from public.entradas where id = p_id;
  if not found then
    return query select 'no_existe'::text, null::text, null::timestamptz;
  elsif v_entrada.anulada then
    return query select 'anulada'::text, v_entrada.nombre_persona, null::timestamptz;
  else
    return query select 'ya_usado'::text, v_entrada.nombre_persona, v_entrada.usado_at;
  end if;
end;
$$;

revoke all on function public.marcar_entrada(uuid, text)
  from public, anon, authenticated;
grant execute on function public.marcar_entrada(uuid, text)
  to service_role;
