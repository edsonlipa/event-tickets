create function public.confirmar_registros(
  p_ids uuid[],
  p_admin_id uuid
)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  with confirmados as (
    update public.registros as registro
       set status = 'pagado',
           confirmado_at = now(),
           confirmado_por = p_admin_id,
           motivo_rechazo = null
     where registro.id = any(p_ids)
       and registro.status = 'pendiente'
    returning registro.id, registro.cantidad_personas, registro.nombres_personas
  ), entradas_creadas as (
    insert into public.entradas (registro_id, nombre_persona)
    select
      confirmado.id,
      nullif(confirmado.nombres_personas ->> posicion.indice, '')
    from confirmados as confirmado
    cross join lateral generate_series(0, confirmado.cantidad_personas - 1) as posicion(indice)
    returning registro_id
  )
  select distinct registro_id from entradas_creadas;
$$;

revoke all on function public.confirmar_registros(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.confirmar_registros(uuid[], uuid)
  to service_role;

create function public.rechazar_registro(
  p_id uuid,
  p_motivo text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(p_motivo)) < 3 or length(trim(p_motivo)) > 500 then
    raise exception 'El motivo debe tener entre 3 y 500 caracteres'
      using errcode = '22023';
  end if;

  update public.registros
     set status = 'rechazado',
         motivo_rechazo = trim(p_motivo)
   where id = p_id
     and status = 'pendiente';

  return found;
end;
$$;

revoke all on function public.rechazar_registro(uuid, text)
  from public, anon, authenticated;
grant execute on function public.rechazar_registro(uuid, text)
  to service_role;
