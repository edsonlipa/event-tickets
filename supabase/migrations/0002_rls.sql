alter table public.evento enable row level security;
alter table public.registros enable row level security;
alter table public.comprobantes enable row level security;
alter table public.entradas enable row level security;
alter table public.intentos_pin enable row level security;
alter table public.rate_limit_eventos enable row level security;

-- No se crean policies. RLS sin policies deniega todo acceso a anon y
-- authenticated; service_role solo se usa desde el servidor.
