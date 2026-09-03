# Estado de implementación

> Actualizado: 2 de septiembre de 2026. Este documento se actualiza en el mismo
> cambio que cierre o bloquee una historia.

## Resumen

| Área | Estado |
|---|---|
| Alcance y PRD | Definidos: II OPEN CHAMPIONSHIP, entrada S/15, 6 de septiembre de 2026 a las 9:00 a. m., Palacio del Deporte José Luis Bustamante y Rivero, Arequipa, sin aforo máximo. |
| Aplicación Next.js | Scaffold creado, dependencias instaladas y build validado con Webpack. |
| Supabase local | Operativo y aislado en los puertos 55420–55429. |
| Base de datos y RLS | Esquema inicial, bucket privado y RLS deny-all verificados localmente. La migración 0013 inserta el evento oficial en proyectos hospedados vacíos, donde `db push` no ejecuta el seed. |
| Correo | US-004 y US-007 hechas: QR real recibido en Gmail; Zoho entrega en Outlook con SPF, DKIM y DMARC. Producto excluyó iCloud y aceptó monitorear la clasificación inicial de Outlook como no deseado. |
| Reintento de correo | US-013 en progreso: se retiró la cuota diaria artificial y se conserva cron protegido, lote técnico de 50, prioridad de acuses, claims atómicos y auditoría. Falta validar el cron desplegado con Bearer. |
| Zona horaria | US-014 hecha: almacenamiento UTC/`timestamptz`, formatos humanos y CSV en `America/Lima`; unitarias bajo tres zonas y 21 E2E con servidor en Tokio/navegador en Auckland aprobados. |
| Feedback de puerta | US-015 implementada localmente: `PASA` y `NO PASA` muestran nombre, motivo y hora autoritativa en Perú; concurrencia, fallback de comprador, PII y offline pasan 5 E2E. Falta migración 0014 y prueba en producción. |
| Acuse de compra | US-010 hecha: correo inmediato con resumen y aviso de confirmación posterior; estado, auditoría y reintento separados del correo con QR. E2E real confirmado por el operador. |
| Código duplicado | US-011 hecha: el constraint de operación duplicada se traduce a HTTP 409 y “El código de operación ya fue enviado.”; limpia el archivo del intento. El E2E aislado confirma que queda un solo comprobante. |
| Acceso LAN de puerta | Corregido: Next.js permite el origen de desarrollo `192.168.3.111`; login verifica la cookie antes de navegar. Cámara móvil continúa requiriendo HTTPS por política del navegador. |
| Hidratación móvil | El warning provenía de atributos `__gcr*` inyectados por Chrome antes de React; los nodos afectados los toleran. El escáner ahora informa explícitamente falta de HTTPS, permiso o cámara. |
| Compra pública | US-002 hecha: compra de 3 entradas con nombres, compresión a 1600 px, Storage privado, aforo y rate limit atómicos; 4 pruebas E2E releen base y archivo. |
| UI de compra | US-008 hecha: estética tipo ticket adaptada del proyecto Lovable, datos dinámicos de `evento` y código/monto por comprobante; revisión móvil y E2E aprobados. |
| Compra en pasos | US-012 hecha: el arte oficial se sirve como banner responsive y el `h1` dinámico permanece oculto visualmente. El flujo móvil tiene dos pasos, resumen editable, aviso para mayores de 5 años, borrador textual, pagos múltiples y validación exacta en cliente/API/SQL. `Cancelar` fue retirado porque nada se persiste antes del registro y `Editar datos` cubre el retorno. Persona 1 hereda el comprador; el monto único es automático y solo se edita al dividir el pago. La hidratación ya no borra un borrador antes de restaurarlo. El flujo productivo fue confirmado y los 8 E2E aislados aprobaron UI, API, Storage, concurrencia y relectura local. |
| Corte inferior en móvil | Corregido: `100vh` mide el viewport sin la barra del navegador móvil, así que el último elemento de cada vista quedaba tapado sin scroll para alcanzarlo — en compra ocultaba el enlace de reenvío. `.event-shell` y el `main` de compra usan `min-h-dvh` más un colchón con `env(safe-area-inset-bottom)`. |
| Pie de página | `PieDePagina` con `LogoIllapa` (SVG inline, rayo amarillo del evento) en compra, gracias, reenviar y `/v/[token]`; excluido de admin y puerta. El mensaje apunta a captación de clientes nuevos, no a soporte del comprador. |
| Entrada pública | US-016 hecha: `/v/[token]` muestra el mismo QR canónico enviado por correo sin consumir la entrada ni exponer datos adicionales. La entrada real indicada se verificó localmente y permaneció con `usado = false`; typecheck, lint y build aprobaron. |
| Fecha visible | US-017 hecha: la fecha humana se centraliza como `06 de setiembre 2026` en `es-PE` y `America/Lima`, con hora separada o compuesta según la vista. Compra, correos, detalle admin y entrada pública usan el formato común; unitarias multi-TZ, typecheck, lint y build aprobaron. |
| Sistema visual | US-009 hecha: compra, confirmación, reenvío, entrada, admin y puerta comparten tokens y componentes Bauhaus; puerta conserva feedback verde/rojo de alto contraste. |
| Panel admin | US-003 hecho: Auth por rol, grilla de 12, búsqueda, signed URLs, detalle, confirmación idempotente individual/en lote, rechazo y contadores. |
| Edición de cantidad | US-018 hecha: una compra pagada muestra primero la explicación y el botón para modificar; el selector aparece solo en modo edición, con guardar y cancelar. Los 6 E2E administrativos, typecheck, lint y build aprobaron. |
| Puerta y PWA | US-005 implementada: PIN firmado y limitado, escáner cross-browser, consumo atómico, búsqueda mínima, cola offline y shell PWA; E2E local aprobado. |
| Operación | US-006 implementada localmente: ajuste pagado transaccional, anulación auditable, export CSV segura y runbook; prueba presencial pendiente. |
| Salida a producción | Runbook de producción creado con fases de Supabase, Vercel/DNS, secretos, correo, E2E, puerta, go/no-go y rollback. Ejecución pendiente. |
| Despliegue | Supabase de producción creado y migrado; RLS anónima y bucket privado verificados. El sitio está en producción sobre `openchampionship.illapa.pe`, que reemplaza a `openchampionship.illapasystems.com`; el proyecto Vercel, las variables, el CNAME y HTTPS quedaron operativos. La compra E2E de producción se validó en Mac y iPhone el 2 de septiembre de 2026, incluido el correo con los QR. Falta la puerta en dos celulares y la aprobación para abrir ventas. |

## Siguiente paso

La compra E2E de producción ya está validada en Mac y iPhone, con el correo de
QR recibido, así que el envío real funciona sobre `openchampionship.illapa.pe`.
Queda correr el cron con autorización Bearer y luego `docs/RUNBOOK_EVENTO.md` en el local con los
dispositivos reales para cerrar la puerta en dos celulares.

La conformidad completa está desglosada en `docs/AUDITORIA_PRD_2026-09-01.md`.
En la verificación de US-008 aprobaron `typecheck`, `lint`, `build` y los cuatro
E2E de compra. Se reprodujo y corrigió un defecto de aislamiento: Playwright
heredaba `SMTP_HOST` y credenciales Zoho desde `.env.local`, por lo que envió los
destinatarios ficticios `@example.test` al SMTP real. El web server E2E ahora
fuerza Mailpit (`127.0.0.1:55425`, sin TLS ni credenciales). La aceptación real de
US-004/US-007 se cerró después con la excepción de producto documentada y no se
confunde con esta prueba local.
Nodemailer solo permite SMTP sin TLS en hosts loopback; los hosts reales conservan
`requireTLS` cuando no usan SMTPS.

US-011 y US-012 aprobaron las 8 pruebas E2E de compra contra Supabase local y Mailpit.
Playwright ahora aborta si la URL de Supabase no es exactamente la local,
por lo que el enlace de la CLI y las credenciales productivas no pueden convertir
esta suite destructiva en una ejecución remota accidental.

US-014 centraliza `America/Lima`, conserva el ISO UTC en exportación y agrega una
columna operativa `created_at_peru`. La suite E2E fuerza zonas diferentes para
servidor y navegador, y los fixtures quedaron aislados del PIN y secretos reales.

US-015 conserva el consumo atómico y ahora devuelve el mismo `ingreso_at` al
primer y segundo escaneo concurrente. El reset local 0001–0014, los 5 E2E de
puerta y la denegación de tablas/RPC a `anon` aprobaron; producción aún no tiene
la migración 0014.

US-009 se verificó visualmente en móvil para reenvío, PIN y entrada inválida, y
mediante `build`, `typecheck` y `lint`. No se ejecutó la suite E2E en esta iteración
porque el operador realizará la prueba real y la base fue limpiada expresamente
para ese flujo; Playwright debe ejecutarse solo con su SMTP forzado a Mailpit.

## Bloqueos externos

- Confirmar `EMAIL_REPLY_TO` definitivo.
- La clasificación inicial de Outlook como correo no deseado queda aceptada y se
  seguirá observando en producción; no bloquea US-007.
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
