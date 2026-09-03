# Auditoría de conformidad con el PRD — 1 de septiembre de 2026

## Resultado ejecutivo

El sistema implementa el núcleo funcional y las defensas críticas del PRD, pero
**todavía no cumple el 100 % de sus criterios de aceptación**. El código cubre las
siete historias originales; cuatro permanecen bloqueadas por validaciones externas
y el despliegue sigue pendiente. Esta auditoría distingue código existente de una
aceptación completa: una prueba automatizada local no sustituye Gmail/Outlook/iCloud,
dos celulares reales ni la prueba en el local.

## Matriz de cumplimiento

| Área del PRD | Estado | Evidencia y brecha |
|---|---|---|
| Cimientos, esquema y RLS | Cumple localmente | Migraciones `0001`–`0008`, RLS activa sin policies y prueba anon local. Falta repetirla en producción desplegada. |
| Bucket privado y signed URLs | Cumple | Bucket `comprobantes` privado; el navegador sube mediante la API del servidor y admin recibe URLs de 300 s. |
| Compra pública | Cumple en local | Validación duplicada, 1–20 entradas, nombres opcionales, monto dinámico, compresión, MIME/5 MB, aforo transaccional y rate limit persistente. E2E relee base y Storage. |
| Datos del evento | Parcial | La UI ya lee nombre, fecha, lugar, precio y Yape desde `evento`. Los valores locales siguen provisionales y faltan QR, lugar/hora/texto definitivos del cliente. |
| Comprobantes múltiples | Parcial | La UI y la tabla admiten N imágenes con código y monto por operación. Aún exige foto; el brief permite “foto y/o código”, pero `storage_path` es `not null`. Se requiere una decisión de producto/esquema para aceptar código sin imagen. |
| Admin y autenticación | Cumple en local | Auth con rol repetida en páginas/APIs, lista, filtros, búsqueda, detalle, rechazo, confirmación idempotente, contadores y signed URLs. |
| Hoja de 12 y lote | Cumple para el caso normal | Pagina 12 registros y muestra la primera imagen por compra. Una compra excepcional con varios comprobantes se revisa completa en detalle, no como N miniaturas separadas en la hoja. |
| Edición pagada y export | Cumple en local | Aumento crea QR; reducción anula solo no usados con auditoría; export protegido neutraliza fórmulas. |
| QR y landing `/v` | Cumple en local | UUID aleatorio, URL con prefijo del sitio, PNG backend/CID y landing informativa que no consume. |
| Correo modular y cola | Cumple con excepción de producto | Nodemailer y Resend comparten composición/cola; un fallo no revierte el pago; cron sin cuota artificial, reenvío admin y autoservicio genérico se prueban con Mailpit. Zoho real fue validado en Gmail y Outlook; producto excluyó iCloud. |
| PIN y sesión de puerta | Cumple en local | Cookie firmada `httpOnly`, rate limit persistente progresivo y APIs protegidas. La expiración definitiva depende de la hora real del evento. |
| Escaneo y consumo atómico | Parcial / bloqueo externo | BarcodeDetector + ZXing, torch condicional, Wake Lock, cuatro resultados y RPC atómica probados. Falta la aceptación simultánea en dos dispositivos reales. |
| Offline y PWA | Parcial / bloqueo externo | Precarga mínima, cola idempotente, búsqueda degradada, manifest y service worker pasan E2E. Falta modo avión, instalación y cámara en los celulares definitivos. |
| Minimización de PII | Cumple | Precarga omite email/celular; búsqueda solo entrega tres últimos dígitos. Las tablas no se consultan desde el cliente. |
| Zona horaria | Cumple | `timestamptz` en esquema y presentación centralizada en `America/Lima`. |
| Despliegue y operación | No cumple aún | CNAME/Vercel y validación RLS de producción pendientes; no se ejecutó el runbook presencial ni la capacitación. |

## Bloqueos que impiden declarar el PRD terminado

1. Recibir y cargar datos definitivos: QR/número Yape, hora, lugar, texto, aforo y
   `Reply-To`.
2. Desplegar en Vercel, configurar el CNAME y repetir la prueba RLS con la anon key.
3. Validar entrega de correo en Gmail, Outlook e iCloud con el proveedor real.
4. Probar puerta con dos celulares reales, cámara, linterna condicional, modo avión
   y escaneo simultáneo.
5. Ejecutar el runbook en el local y capacitar a organizador y guardias.

## Referencia Lovable analizada

Se reutilizó su lenguaje visual Bauhaus y su composición tipo ticket. No se copió
su arquitectura porque escribe compras y comprobantes desde el navegador mediante
el cliente Supabase, depende de configuración hardcodeada y no implementa el modelo
de seguridad, aforo, correo, puerta ni operación exigidos por este PRD.
