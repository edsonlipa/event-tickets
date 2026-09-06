-- Datos de prueba para US-025: fallos de correo visibles en el panel.
-- Uso:  npm run supabase:start  &&  npm run datos:fallos-correo
-- Todos los registros usan @prueba.test para poder borrarlos de una vez.

begin;

delete from public.registros where email like '%@prueba.test';

-- Las compras que deben quedar PAGADAS entran como 'pendiente' y se confirman
-- mas abajo con `confirmar_registros`, la misma funcion que usa el panel. Antes
-- se insertaban ya en 'pagado', lo que dejaba compras confirmadas sin ninguna
-- entrada emitida: un estado que el flujo real no puede producir y que hacia
-- inservibles estas filas para probar los enlaces de entradas y el envio por
-- WhatsApp.
insert into public.registros
  (id, nombre_pagador, celular, email, cantidad_personas, nombres_personas, precio_unitario, status, motivo_rechazo,
   email_registro_enviado, email_registro_error, email_registro_intento_at,
   email_enviado, email_error, email_intento_at)
values
  -- 1. Confirmacion de registro fallida sobre una compra PENDIENTE: antes invisible.
  ('aaaa0001-0000-4000-8000-000000000001', 'Ana Quispe (confirmacion: correo inexistente)', '999111222',
   'ana@prueba.test', 2, '["Ana Quispe", "Beto Quispe"]', 15, 'pendiente', null,
   false, '550 5.1.1 <ana@prueba.test>: Recipient address rejected: User unknown', now() - interval '2 hours',
   false, null, null),

  -- 2. Entradas fallidas por buzon lleno: temporal, el cron reintenta.
  ('aaaa0002-0000-4000-8000-000000000002', 'Luis Torres (entradas: buzon lleno)', '999333444',
   'luis@prueba.test', 1, '["Luis Torres"]', 15, 'pendiente', null,
   true, null, null,
   false, '552 5.2.2 Mailbox full: over quota', now() - interval '25 minutes'),

  -- 3. Entradas rechazadas por filtro de spam: permanente, hay que llamar.
  ('aaaa0003-0000-4000-8000-000000000003', 'Rosa Mamani (entradas: filtro de spam)', '999555666',
   'rosa@prueba.test', 3, '["Rosa Mamani", "Ines Mamani", ""]', 15, 'pendiente', null,
   true, null, null,
   false, '550 5.7.1 Message blocked due to spam policy', now() - interval '10 minutes'),

  -- 4. Fallo temporal de red: no requiere accion.
  ('aaaa0004-0000-4000-8000-000000000004', 'Pedro Ccama (entradas: red temporal)', '999777888',
   'pedro@prueba.test', 1, '["Pedro Ccama"]', 15, 'pendiente', null,
   true, null, null,
   false, 'connect ETIMEDOUT 172.66.0.1:465', now() - interval '5 minutes'),

  -- 5. Configuracion del proveedor: no es culpa del comprador.
  ('aaaa0005-0000-4000-8000-000000000005', 'Sofia Ramos (confirmacion: proveedor mal configurado)', '999999000',
   'sofia@prueba.test', 2, '["Sofia Ramos", "Hugo Ramos"]', 15, 'pendiente', null,
   false, 'The domain illapa.pe is not verified. Please verify it in the dashboard.', now() - interval '1 hour',
   false, null, null),

  -- 6. DOS fallos a la vez en el mismo registro.
  ('aaaa0006-0000-4000-8000-000000000006', 'Carmen Apaza (confirmacion Y entradas fallidos)', '999000111',
   'carmen@prueba.test', 4, '["Carmen Apaza", "", "", ""]', 15, 'pendiente', null,
   false, 'connect ECONNREFUSED smtppro.zoho.com:465', now() - interval '3 hours',
   false, '550 5.1.1 mailbox not found', now() - interval '30 minutes'),

  -- 7. Rechazado con aviso fallido: el fallo vive en email_envios.
  ('aaaa0007-0000-4000-8000-000000000007', 'Jorge Huaman (rechazo: aviso no enviado)', '999222333',
   'jorge@prueba.test', 1, '["Jorge Huaman"]', 15, 'rechazado', 'El comprobante esta borroso y no se lee el monto.',
   true, null, null,
   false, null, null),

  -- 8. TODO CORRECTO: no debe mostrar ningun distintivo.
  ('aaaa0008-0000-4000-8000-000000000008', 'Elena Flores (sin problemas)', '999444555',
   'elena@prueba.test', 2, '["Elena Flores", "Mario Flores"]', 15, 'pendiente', null,
   true, null, null,
   true, null, null);

-- Emite las entradas de las compras pagadas por el mismo camino que el panel:
-- `confirmar_registros` cambia el estado e inserta los QR en una sola sentencia,
-- asi que la fila y sus entradas nunca quedan desalineadas. Sin admin: la
-- columna `confirmado_por` acepta null y aqui no hay sesion que atribuir.
select public.confirmar_registros(
  array[
    'aaaa0002-0000-4000-8000-000000000002',
    'aaaa0003-0000-4000-8000-000000000003',
    'aaaa0004-0000-4000-8000-000000000004',
    'aaaa0006-0000-4000-8000-000000000006',
    'aaaa0008-0000-4000-8000-000000000008'
  ]::uuid[],
  null
);

-- Aviso de rechazo fallido para el registro 7.
insert into public.email_envios (registro_id, tipo, exito, error, created_at)
values ('aaaa0007-0000-4000-8000-000000000007', 'rechazo', false,
        '421 4.7.0 Try again later, closing connection', now() - interval '45 minutes');

-- Y un caso que NO debe aparecer: fallo seguido de exito posterior.
insert into public.email_envios (registro_id, tipo, exito, error, created_at)
values ('aaaa0008-0000-4000-8000-000000000008', 'rechazo', false, 'timeout', now() - interval '2 hours'),
       ('aaaa0008-0000-4000-8000-000000000008', 'rechazo', true,  null,      now() - interval '1 hour');

-- Comprobante para que la grilla muestre algo en cada tarjeta.
insert into public.comprobantes (registro_id, storage_path, monto)
select id, id || '/1.png', monto_esperado from public.registros where email like '%@prueba.test';

commit;

select r.nombre_pagador, r.status,
       r.email_registro_error is not null as acuse_fallo,
       r.email_error is not null as entradas_fallo,
       count(e.id) filter (where not e.anulada) as entradas
  from public.registros r
  left join public.entradas e on e.registro_id = r.id
 where r.email like '%@prueba.test'
 group by r.id, r.nombre_pagador, r.status, r.email_registro_error, r.email_error
 order by r.nombre_pagador;
