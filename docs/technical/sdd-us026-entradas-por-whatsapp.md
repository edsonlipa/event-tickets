# SDD US-026 — Enviar las entradas por WhatsApp desde el panel

## Alcance

Que el operador pueda entregar las entradas de una compra pagada por WhatsApp,
sin depender de que el correo llegue.

## Problema

El correo es hoy el único canal de entrega. Cuando falla —buzón lleno, dominio
mal escrito, filtro de spam— el panel ya muestra la causa (US-025) y el cron
reintenta, pero el comprador sigue sin sus QR y el operador no tiene con qué
responderle. El registro ya guarda el celular, y en el evento el canal real de
contacto es WhatsApp.

## Decisiones

1. **Enlace, no imagen.** `wa.me` solo transporta texto: no admite adjuntar el
   arte de la entrada ni el PNG del QR. El mensaje lleva el enlace canónico de
   cada entrada —`${NEXT_PUBLIC_SITE_URL}/v/<uuid>`, el mismo que codifica el
   QR—, que abre la entrada con su QR visible y no la consume.
2. **Sin backend.** El botón es un `<a href>` a `wa.me` armado en el servidor. No
   hay API, ni credenciales de WhatsApp Business, ni registro de envío: quien
   manda el mensaje es el operador desde su propio WhatsApp Web o su celular.
3. **El correo manda.** WhatsApp no reemplaza ni altera `email_enviado` ni la
   cola de reintentos. Es un canal manual y paralelo, disponible cuando el
   operador lo decide.
4. **Solo compras pagadas.** Sin QR emitidos no hay nada que enviar; en
   `pendiente` y `rechazado` no se consulta la tabla `entradas` ni se muestra el
   botón.
5. **Solo entradas vigentes.** Las anuladas por un ajuste quedan fuera: su
   enlace ya no vale.
6. **Un enlace por línea.** WhatsApp vuelve tocable un URL solo si no lleva
   texto ni puntuación pegados, así que el nombre de la persona va en su propia
   línea y el enlace en la siguiente. Ojo al probar en local: WhatsApp tampoco
   convierte en enlace una IP con puerto (`http://192.168.3.111:3000/...`)
   porque no reconoce un dominio; con el dominio real de producción sí lo hace.

## Normalización del celular

El formulario de compra acepta el celular como texto libre (`999 888 777`,
`+51 999 888 777`, `051-999-888-777`), y `wa.me` exige dígitos con código de
país. `normalizarNumeroWhatsapp` (`src/lib/whatsapp.ts`) resuelve:

| Lo que escribió el comprador | Número marcado | Por qué |
|---|---|---|
| 9 dígitos que empiezan en 9 | `51` + número | Único formato local de celular en Perú |
| 10 a 15 dígitos | tal cual | Ya trae código de país |
| cualquier otra cosa | `null` | No es marcable |

Con `null` el enlace se emite igual pero sin número: `wa.me/?text=` abre el
selector de contactos con el mensaje ya escrito, y el aviso bajo el botón lo
explica. Es preferible a esconder el botón por un celular mal tecleado.

## Dónde vive cada pieza

- `src/lib/whatsapp.ts` — lógica pura, sin imports, verificable con
  `npm run test:whatsapp`. La fecha llega ya formateada por `@/lib/fecha` para
  no duplicar la zona horaria del evento.
- `src/lib/admin-data.ts` — `listarEntradasDeRegistro` y `obtenerEvento`, ambas
  con `service_role` en el servidor.
- `src/app/admin/registros/[id]/page.tsx` — arma el enlace y lista las entradas
  emitidas con su URL, para copiar una suelta o verificar qué se está mandando.
- `src/components/AccionesRegistro.tsx` — el botón, junto a «Reenviar correo».

## Aceptación

- Una compra pagada muestra el botón; el enlace abre el chat del celular
  registrado con el mensaje listo, que incluye el enlace de cada entrada activa.
- Una compra sin entradas emitidas no muestra el botón ni la lista.
- Las entradas anuladas no aparecen en el mensaje ni en la lista.
- El nombre, la fecha y el lugar salen de la fila `evento`.
- `typecheck`, `lint`, `build`, `test:whatsapp` y los E2E de admin aprobados.

## Fuera de alcance

La API de WhatsApp Business, el envío automático al confirmar el pago y el
registro de qué se mandó por WhatsApp. El canal auditado sigue siendo el correo.
