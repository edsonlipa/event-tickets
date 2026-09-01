alter table public.registros
  add column email_intento_at timestamptz;

alter table public.evento
  add column lugar text;

create table public.email_envios (
  id bigint generated always as identity primary key,
  registro_id uuid not null references public.registros(id) on delete cascade,
  exito boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create index email_envios_exito_created_at_idx
  on public.email_envios (exito, created_at desc);

alter table public.email_envios enable row level security;

create index registros_correos_pendientes_idx
  on public.registros (created_at)
  where status = 'pagado' and email_enviado = false;

create function public.reclamar_correo(
  p_id uuid,
  p_forzar boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registros
     set email_enviado = case when p_forzar then false else email_enviado end,
         email_intento_at = now(),
         email_error = null
   where id = p_id
     and status = 'pagado'
     and (p_forzar or email_enviado = false)
     and (email_intento_at is null or email_intento_at < now() - interval '10 minutes');
  return found;
end;
$$;

revoke all on function public.reclamar_correo(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.reclamar_correo(uuid, boolean)
  to service_role;
