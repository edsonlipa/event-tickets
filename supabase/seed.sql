-- Datos exclusivos para desarrollo local. Reemplazar antes de cualquier despliegue.
insert into public.evento (
  nombre,
  fecha,
  precio_unitario,
  aforo_maximo,
  yape_numero,
  yape_titular
)
values (
  'OpenChampionship UNA',
  '2026-09-06 18:00:00-05',
  15.00,
  null,
  '943771077',
  'OpenChampionship UNA'
)
on conflict do nothing;
