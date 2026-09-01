# Estado de implementación

> Actualizado: 1 de septiembre de 2026. Este documento se actualiza en el mismo
> cambio que cierre o bloquee una historia.

## Resumen

| Área | Estado |
|---|---|
| Alcance y PRD | Definidos: II OPEN CHAMPIONSHIP, entrada S/15, 6 de septiembre de 2026 a las 9:00 a. m., Palacio del Deporte José Luis Bustamante y Rivero, Arequipa, sin aforo máximo. |
| Aplicación Next.js | Scaffold creado, dependencias instaladas y build validado con Webpack. |
| Supabase local | Operativo y aislado en los puertos 55420–55429. |
| Base de datos y RLS | Esquema inicial, bucket privado y RLS deny-all verificados localmente. |
| Correo | Providers Nodemailer/SMTP y Resend modularizados; Mailpit con QR CID validado. Zoho/Resend y entrega real pendientes. |
| Acuse de compra | US-010 hecha: correo inmediato con resumen y aviso de confirmación posterior; estado, auditoría y reintento separados del correo con QR. E2E real confirmado por el operador. |
| Código duplicado | US-011 implementada: el constraint de operación duplicada se traduce a HTTP 409 y “El código de operación ya fue enviado.”; limpia el archivo del intento. E2E pendiente. |
| Acceso LAN de puerta | Corregido: Next.js permite el origen de desarrollo `192.168.3.111`; login verifica la cookie antes de navegar. Cámara móvil continúa requiriendo HTTPS por política del navegador. |
| Hidratación móvil | El warning provenía de atributos `__gcr*` inyectados por Chrome antes de React; los nodos afectados los toleran. El escáner ahora informa explícitamente falta de HTTPS, permiso o cámara. |
| Compra pública | US-002 hecha: compra de 3 entradas con nombres, compresión a 1600 px, Storage privado, aforo y rate limit atómicos; 4 pruebas E2E releen base y archivo. |
| UI de compra | US-008 hecha: estética tipo ticket adaptada del proyecto Lovable, datos dinámicos de `evento` y código/monto por comprobante; revisión móvil y E2E aprobados. |
| Compra en pasos | US-012 implementada: el arte oficial de `Oficial redes.pdf` se sirve como banner responsive sobre el ticket; como el arte ya contiene el nombre, el `h1` dinámico del encabezado se conserva en código pero permanece oculto visualmente. El flujo móvil tiene dos pasos, resumen editable, aviso de entrada para mayores de 5 años, borrador textual, pagos múltiples y validación exacta en cliente/API/SQL. Se retiró Cancelar porque nada se persiste antes del registro y Editar datos cubre el retorno. Persona 1 hereda el nombre del comprador mientras no se edite manualmente. Con un pago el monto es automático y bloqueado; solo se vuelve editable al dividirlo; la interfaz explica que esta opción sirve cuando el total supera el límite diario de Yape. El QR ocupa su cuadro completo y copiar número es un icono adyacente. E2E automatizado pendiente por el servidor dev activo del operador. |
| Sistema visual | US-009 hecha: compra, confirmación, reenvío, entrada, admin y puerta comparten tokens y componentes Bauhaus; puerta conserva feedback verde/rojo de alto contraste. |
| Panel admin | US-003 hecho: Auth por rol, grilla de 12, búsqueda, signed URLs, detalle, confirmación idempotente individual/en lote, rechazo y contadores. |
| Puerta y PWA | US-005 implementada: PIN firmado y limitado, escáner cross-browser, consumo atómico, búsqueda mínima, cola offline y shell PWA; E2E local aprobado. |
| Operación | US-006 implementada localmente: ajuste pagado transaccional, anulación auditable, export CSV segura y runbook; prueba presencial pendiente. |
| Despliegue | Pendiente. |

## Siguiente paso

Configurar una contraseña de aplicación de Zoho en el entorno desplegado, probar
el alias `no-reply` y ejecutar la matriz Gmail/Outlook/iCloud. Luego ejecutar
`docs/RUNBOOK_EVENTO.md` en el local con los dispositivos reales.

La conformidad completa está desglosada en `docs/AUDITORIA_PRD_2026-09-01.md`.
En la verificación de US-008 aprobaron `typecheck`, `lint`, `build` y los cuatro
E2E de compra. Se reprodujo y corrigió un defecto de aislamiento: Playwright
heredaba `SMTP_HOST` y credenciales Zoho desde `.env.local`, por lo que envió los
destinatarios ficticios `@example.test` al SMTP real. El web server E2E ahora
fuerza Mailpit (`127.0.0.1:55425`, sin TLS ni credenciales). La aceptación real de
correo permanece bloqueada en US-004/US-007 y no se confunde con esta prueba local.
Nodemailer solo permite SMTP sin TLS en hosts loopback; los hosts reales conservan
`requireTLS` cuando no usan SMTPS.

US-012 aprobó `typecheck`, `lint`, `build`, aplicación de la migración local y
la comprobación RLS con anon en `evento`, `registros`, `comprobantes` y
`entradas`. La suite de compra quedó actualizada, pero Next.js rechazó levantar
el servidor E2E aislado en el puerto 3001 porque ya existe un `next dev` del
operador en este repositorio (PID 52684). No se detuvo ese proceso ni se ejecutó
la suite contra el puerto 3000 para evitar usar accidentalmente el SMTP real.

US-009 se verificó visualmente en móvil para reenvío, PIN y entrada inválida, y
mediante `build`, `typecheck` y `lint`. No se ejecutó la suite E2E en esta iteración
porque el operador realizará la prueba real y la base fue limpiada expresamente
para ese flujo; Playwright debe ejecutarse solo con su SMTP forzado a Mailpit.

## Bloqueos externos

- Confirmar `EMAIL_REPLY_TO` definitivo.
- Contraseña de aplicación/host Zoho o credencial Resend y despliegue para probar
  entrega real en Gmail, Outlook e iCloud; hasta entonces US-004 y US-007 no
  cumplen por completo sus criterios.
- Dos celulares reales y el dispositivo definitivo de los guardias para probar
  cámara, linterna, instalación, escaneo simultáneo y modo avión; hasta entonces
  US-005 no cumple por completo su criterio del PRD.
- Local, organizador y guardias para ejecutar la prueba E2E sin ayuda, medir el
  acceso y completar capacitación; hasta entonces US-006 sigue bloqueada.

## Datos locales provisionales

El seed local carga **II OPEN CHAMPIONSHIP**, entrada S/15, domingo 6 de
septiembre de 2026 a las 9:00 a. m., sin aforo máximo, en el Palacio del Deporte
José Luis Bustamante y Rivero, Arequipa. Yape está configurado con `964197335`,
titular `Joyce Alessandra Valdivia Paredes` y el QR recibido en
`/yape-qr.png`, recortado sin reescalado ni regeneración.
