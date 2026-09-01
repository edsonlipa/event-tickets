alter table public.registros
  add column email_registro_enviado boolean not null default false,
  add column email_registro_enviado_at timestamptz,
  add column email_registro_error text,
  add column email_registro_intento_at timestamptz;

alter table public.email_envios
  add column tipo text not null default 'entradas'
  check (tipo in ('registro_recibido', 'entradas'));

create index registros_acuses_pendientes_idx
  on public.registros (created_at)
  where email_registro_enviado = false;

create function public.reclamar_correo_registro(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registros
     set email_registro_intento_at = now(),
         email_registro_error = null
   where id = p_id
     and email_registro_enviado = false
     and (email_registro_intento_at is null
          or email_registro_intento_at < now() - interval '10 minutes');
  return found;
end;
$$;

revoke all on function public.reclamar_correo_registro(uuid)
  from public, anon, authenticated;
grant execute on function public.reclamar_correo_registro(uuid)
  to service_role;
