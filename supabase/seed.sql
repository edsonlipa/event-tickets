-- Datos exclusivos para desarrollo local. Reemplazar antes de cualquier despliegue.
insert into public.evento (
  nombre,
  fecha,
  lugar,
  precio_unitario,
  aforo_maximo,
  yape_numero,
  yape_titular,
  yape_qr_url
)
values (
  'II OPEN CHAMPIONSHIP',
  '2026-09-06 09:00:00-05',
  'Palacio del Deporte José Luis Bustamante y Rivero, Arequipa',
  15.00,
  null,
  '964197335',
  'Joyce Alessandra Valdivia Paredes',
  '/yape-qr.png'
)
on conflict do nothing;
