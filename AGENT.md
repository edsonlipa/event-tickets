# Guía de trabajo para agentes

## Fuente de verdad

- La guía operativa para agentes vive en `AGENTS.md`; este archivo resume las
  reglas de producto.
- El alcance y las decisiones funcionales viven en `PROJECT_BRIEF.md` (v2.3).
- El plan de ejecución, rutas, estructura y criterios de aceptación viven en `PRD.md`.
- `docs/PROJECT_BRIEF_v1.md` es histórico; no debe usarse para tomar decisiones.
- Ante una contradicción, priorizar el brief vigente y señalarla antes de implementar.

## Objetivo del producto

Sistema de venta de entradas para un único evento: pago por Yape con validación
manual, emisión de QR por correo y validación rápida en puerta mediante PWA.
No hay pasarela, WhatsApp, reingresos, app nativa ni soporte multi-evento en v1.

## Decisiones no negociables

- Next.js App Router desplegado en Vercel; Supabase Postgres/Auth/Storage; Resend
  para correo.
- Todas las tablas tienen RLS habilitada y sin policies para `anon` ni
  `authenticated`. El acceso a datos es exclusivamente desde el servidor con
  `SUPABASE_SERVICE_ROLE_KEY`.
- Todo módulo que use `service_role` comienza con `import 'server-only'`. Nunca
  exponer esa clave ni usarla en componentes cliente.
- El bucket `comprobantes` es privado. Solo el admin puede ver archivos mediante
  URLs firmadas y de corta duración.
- Los QR contienen `${NEXT_PUBLIC_SITE_URL}/v/<uuid>`, no un ID correlativo ni el
  UUID aislado.
- Marcar una entrada como usada debe ser un `UPDATE ... WHERE usado = false AND
  anulada = false RETURNING ...` atómico. Nunca implementar lectura y actualización
  separadas.
- El estado de pago y el envío de correo son independientes: un fallo de Resend no
  revierte una confirmación de pago. Registrar `email_error` y permitir reintento.
- La búsqueda de puerta minimiza PII: no devolver email ni celular completo.

## Reglas de implementación

- Usar TypeScript estricto y validar toda entrada pública en el servidor.
- Almacenar tiempos como `timestamptz` y presentar fechas mediante un único helper
  configurado para `America/Lima`.
- Mantener endpoints públicos con rate limit persistente: registros, reenvío y PIN.
- La respuesta del reenvío público siempre es genérica para evitar enumeración de
  compradores.
- La página `/v/[token]` solo muestra la entrada; no la consume.
- La vista de puerta debe soportar `BarcodeDetector` y fallback `@zxing/browser`.
  La linterna es condicional; no asumir soporte en iOS.
- La precarga offline y la cola local son un modo degradado conocido: advertirlo en
  la UI y sincronizar de forma idempotente al volver la conexión.

## Modelo y comportamiento clave

- Un `registro` puede tener varios `comprobantes` y varias `entradas`.
- La confirmación de pago es idempotente y solo opera si el registro está
  `pendiente`.
- Cambiar la cantidad después de confirmar agrega entradas o anula entradas no
  usadas; nunca borra entradas emitidas.
- La validación de aforo cuenta entradas emitidas más reservas pendientes recientes.

## Calidad y verificación

- No marcar una tarea como terminada sin su criterio de aceptación del PRD.
- Antes de desplegar, verificar que la `anon key` no puede leer ninguna tabla.
- Probar la concurrencia: dos escaneos simultáneos del mismo QR deben producir un
  solo `admitido`.
- Probar correo con Gmail, Outlook e iCloud; forzar al menos un fallo de envío y
  confirmar que la cola de reintento lo recupera.
- Realizar la prueba end-to-end en el local y en los dispositivos reales de puerta.

## Datos configurables y secretos

- No versionar `.env.local` ni secretos.
- Mantener `.env.local.example` actualizado sin valores sensibles.
- Configurar mediante entorno la URL pública, claves de Supabase, Resend, PIN y
  `SESSION_SECRET`.
- Los contenidos del evento (nombre, fecha/hora, lugar, aforo y datos Yape) se
  obtienen de la fila única `evento`; no hardcodearlos en componentes.

## Entorno local

- Supabase local se opera con la CLI oficial y Docker; no mantener una composición
  manual alternativa del stack de Supabase.
- El servidor de correo local viene incluido con Supabase y se usa también para
  los correos de la aplicación en desarrollo; producción usa Resend.

## Prioridad si falta tiempo

Nunca recortar RLS, la actualización atómica, búsqueda manual en puerta ni
validación de monto. El orden de recorte restante se rige por §7 de `PRD.md`.
