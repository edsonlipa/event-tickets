-- Datos de prueba para US-025: fallos de correo visibles en el panel.
-- Uso:  npm run supabase:start  &&  npm run datos:fallos-correo
-- Todos los registros usan @prueba.test para poder borrarlos de una vez.

begin;

delete from public.registros where email like '%@prueba.test';

insert into public.registros
  (id, nombre_pagador, celular, email, cantidad_personas, precio_unitario, status, motivo_rechazo,
   email_registro_enviado, email_registro_error, email_registro_intento_at,
   email_enviado, email_error, email_intento_at)
values
  -- 1. Confirmacion de registro fallida sobre una compra PENDIENTE: antes invisible.
  ('aaaa0001-0000-4000-8000-000000000001', 'Ana Quispe (confirmacion: correo inexistente)', '999111222',
   'ana@prueba.test', 2, 15, 'pendiente', null,
   false, '550 5.1.1 <ana@prueba.test>: Recipient address rejected: User unknown', now() - interval '2 hours',
   false, null, null),

  -- 2. Entradas fallidas por buzon lleno: temporal, el cron reintenta.
  ('aaaa0002-0000-4000-8000-000000000002', 'Luis Torres (entradas: buzon lleno)', '999333444',
   'luis@prueba.test', 1, 15, 'pagado', null,
   true, null, null,
   false, '552 5.2.2 Mailbox full: over quota', now() - interval '25 minutes'),

  -- 3. Entradas rechazadas por filtro de spam: permanente, hay que llamar.
  ('aaaa0003-0000-4000-8000-000000000003', 'Rosa Mamani (entradas: filtro de spam)', '999555666',
   'rosa@prueba.test', 3, 15, 'pagado', null,
   true, null, null,
   false, '550 5.7.1 Message blocked due to spam policy', now() - interval '10 minutes'),

  -- 4. Fallo temporal de red: no requiere accion.
  ('aaaa0004-0000-4000-8000-000000000004', 'Pedro Ccama (entradas: red temporal)', '999777888',
   'pedro@prueba.test', 1, 15, 'pagado', null,
   true, null, null,
   false, 'connect ETIMEDOUT 172.66.0.1:465', now() - interval '5 minutes'),

  -- 5. Configuracion del proveedor: no es culpa del comprador.
  ('aaaa0005-0000-4000-8000-000000000005', 'Sofia Ramos (confirmacion: proveedor mal configurado)', '999999000',
   'sofia@prueba.test', 2, 15, 'pendiente', null,
   false, 'The domain illapa.pe is not verified. Please verify it in the dashboard.', now() - interval '1 hour',
   false, null, null),

  -- 6. DOS fallos a la vez en el mismo registro.
  ('aaaa0006-0000-4000-8000-000000000006', 'Carmen Apaza (confirmacion Y entradas fallidos)', '999000111',
   'carmen@prueba.test', 4, 15, 'pagado', null,
   false, 'connect ECONNREFUSED smtppro.zoho.com:465', now() - interval '3 hours',
   false, '550 5.1.1 mailbox not found', now() - interval '30 minutes'),

  -- 7. Rechazado con aviso fallido: el fallo vive en email_envios.
  ('aaaa0007-0000-4000-8000-000000000007', 'Jorge Huaman (rechazo: aviso no enviado)', '999222333',
   'jorge@prueba.test', 1, 15, 'rechazado', 'El comprobante esta borroso y no se lee el monto.',
   true, null, null,
   false, null, null),

  -- 8. TODO CORRECTO: no debe mostrar ningun distintivo.
  ('aaaa0008-0000-4000-8000-000000000008', 'Elena Flores (sin problemas)', '999444555',
   'elena@prueba.test', 2, 15, 'pagado', null,
   true, null, null,
   true, null, null);

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

select nombre_pagador, status, email_registro_error is not null as acuse_fallo,
       email_error is not null as entradas_fallo
  from public.registros where email like '%@prueba.test' order by email;
