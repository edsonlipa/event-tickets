create extension if not exists pgcrypto with schema extensions;

create table public.evento (
  id uuid primary key default extensions.gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  fecha timestamptz not null,
  precio_unitario numeric(10, 2) not null check (precio_unitario > 0),
  aforo_maximo integer check (aforo_maximo is null or aforo_maximo > 0),
  yape_numero text not null check (length(trim(yape_numero)) > 0),
  yape_titular text not null check (length(trim(yape_titular)) > 0)
);

create unique index evento_una_sola_fila on public.evento ((true));

create table public.registros (
  id uuid primary key default extensions.gen_random_uuid(),
  nombre_pagador text not null check (length(trim(nombre_pagador)) > 0),
  celular text not null check (length(trim(celular)) > 0),
  email text not null check (length(trim(email)) > 0),
  cantidad_personas integer not null check (cantidad_personas between 1 and 20),
  precio_unitario numeric(10, 2) not null check (precio_unitario > 0),
  monto_esperado numeric(10, 2)
    generated always as (cantidad_personas * precio_unitario) stored,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'rechazado')),
  motivo_rechazo text,
  email_enviado boolean not null default false,
  email_enviado_at timestamptz,
  email_error text,
  confirmado_at timestamptz,
  confirmado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    (status = 'rechazado' and motivo_rechazo is not null)
    or status <> 'rechazado'
  )
);

create index registros_status_created_at_idx
  on public.registros (status, created_at desc);
create index registros_email_idx on public.registros (lower(email));
create index registros_celular_idx on public.registros (celular);

create table public.comprobantes (
  id uuid primary key default extensions.gen_random_uuid(),
  registro_id uuid not null references public.registros(id) on delete cascade,
  storage_path text not null check (length(trim(storage_path)) > 0),
  codigo_operacion text,
  monto numeric(10, 2) check (monto is null or monto > 0),
  created_at timestamptz not null default now()
);

create unique index comprobantes_codigo_operacion_uniq
  on public.comprobantes (codigo_operacion)
  where codigo_operacion is not null;
create index comprobantes_registro_id_idx on public.comprobantes (registro_id);

create table public.entradas (
  id uuid primary key default extensions.gen_random_uuid(),
  registro_id uuid not null references public.registros(id) on delete cascade,
  nombre_persona text,
  anulada boolean not null default false,
  usado boolean not null default false,
  usado_at timestamptz,
  usado_por text,
  created_at timestamptz not null default now(),
  check (not (anulada and usado))
);

create index entradas_registro_id_idx on public.entradas (registro_id);
create index entradas_validas_idx on public.entradas (usado) where anulada = false;

create table public.intentos_pin (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  exito boolean not null,
  created_at timestamptz not null default now()
);

create index intentos_pin_ip_hash_created_at_idx
  on public.intentos_pin (ip_hash, created_at desc);

create table public.rate_limit_eventos (
  id bigint generated always as identity primary key,
  alcance text not null check (alcance in ('registro', 'reenviar', 'pin')),
  clave_hash text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_eventos_alcance_clave_created_at_idx
  on public.rate_limit_eventos (alcance, clave_hash, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes',
  'comprobantes',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
