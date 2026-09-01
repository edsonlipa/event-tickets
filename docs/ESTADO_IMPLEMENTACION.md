# Estado de implementación

> Actualizado: 1 de septiembre de 2026. Este documento se actualiza en el mismo
> cambio que cierre o bloquee una historia.

## Resumen

| Área | Estado |
|---|---|
| Alcance y PRD | Definidos: entrada S/15; evento 6 de septiembre de 2026. |
| Aplicación Next.js | Scaffold creado, dependencias instaladas y build validado con Webpack. |
| Supabase local | Operativo y aislado en los puertos 55420–55429. |
| Base de datos y RLS | Esquema inicial, bucket privado y RLS deny-all verificados localmente. |
| Correo | Providers Nodemailer/SMTP y Resend modularizados; Mailpit con QR CID validado. Zoho/Resend y entrega real pendientes. |
| Compra pública | US-002 hecha: compra de 3 entradas con nombres, compresión a 1600 px, Storage privado, aforo y rate limit atómicos; 4 pruebas E2E releen base y archivo. |
| Panel admin | US-003 hecho: Auth por rol, grilla de 12, búsqueda, signed URLs, detalle, confirmación idempotente individual/en lote, rechazo y contadores. |
| Puerta y PWA | US-005 implementada: PIN firmado y limitado, escáner cross-browser, consumo atómico, búsqueda mínima, cola offline y shell PWA; E2E local aprobado. |
| Operación | US-006 implementada localmente: ajuste pagado transaccional, anulación auditable, export CSV segura y runbook; prueba presencial pendiente. |
| Despliegue | Pendiente. |

## Siguiente paso

Configurar una contraseña de aplicación de Zoho en el entorno desplegado, probar
el alias `no-reply` y ejecutar la matriz Gmail/Outlook/iCloud. Luego ejecutar
`docs/RUNBOOK_EVENTO.md` en el local con los dispositivos reales.

## Bloqueos externos

- QR y número Yape del organizador para abrir la venta.
- Hora, nombre, lugar y texto final del evento.
- Confirmar `EMAIL_REPLY_TO` definitivo.
- Contraseña de aplicación/host Zoho o credencial Resend y despliegue para probar
  entrega real en Gmail, Outlook e iCloud; hasta entonces US-004 y US-007 no
  cumplen por completo sus criterios.
- Dos celulares reales y el dispositivo definitivo de los guardias para probar
  cámara, linterna, instalación, escaneo simultáneo y modo avión; hasta entonces
  US-005 no cumple por completo su criterio del PRD.
- Local, organizador y guardias para ejecutar la prueba E2E sin ayuda, medir el
  acceso y completar capacitación; hasta entonces US-006 sigue bloqueada.
- Aforo máximo (hasta entonces se configura como `null`).

## Datos locales provisionales

El seed local carga **OpenChampionship UNA**, entrada S/15, domingo 6 de
septiembre de 2026 a las 18:00 (hora provisional), Yape `943771077` y titular
temporal `OpenChampionship UNA`. No son datos de producción: se reemplazan al
confirmar la información del organizador. `yape_qr_url` permanece en `null`; la
interfaz degrada al número y advierte que el QR real sigue pendiente.
