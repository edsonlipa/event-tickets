# Runbook de salida a producción

> II OPEN CHAMPIONSHIP — 6 de septiembre de 2026, 9:00 a. m.
>
> Este documento no contiene contraseñas, tokens, PIN, `service_role` ni otros
> secretos. Los valores sensibles se guardan únicamente en Supabase, Vercel y el
> proveedor de correo. Ningún comando `--linked`, `db push` o reset remoto se
> ejecuta sin autorización explícita.

## Estado de la salida

| Fase | Estado | Evidencia / responsable |
|---|---|---|
| Proyecto Supabase de producción | Confirmado | Ref `lqzbqozbuvtafegzlhgc`; proyecto creado vacío |
| Migraciones `0001`–`0013` | Confirmado | Dry-run revisado y `db push` finalizado correctamente |
| RLS y Storage privado | Confirmado | anon lee cero, insert bloqueado con 42501, bucket privado |
| Usuario administrador | Confirmado | `arakado@illapa.pe`, rol `admin`; no registrar contraseña aquí |
| Cuenta Vercel y repositorio GitHub | Confirmado | Confirmado por el operador el 1 de septiembre de 2026 |
| Proyecto y variables Vercel | Pendiente | |
| Dominio `openchampionship.illapasystems.com` | Pendiente | Zona `illapasystems.com` administrada en Namecheap |
| Correo real y cron | Pendiente | |
| Compra E2E en producción | Pendiente | |
| Puerta en dos celulares | Pendiente | |
| Aprobación para abrir ventas | Pendiente | |

## 1. Datos confirmados

| Dato | Valor |
|---|---|
| Evento | II OPEN CHAMPIONSHIP |
| Fecha y hora | 6 de septiembre de 2026, 9:00 a. m. (`America/Lima`) |
| Lugar | Palacio del Deporte José Luis Bustamante y Rivero, Arequipa |
| Precio | S/15.00 por entrada |
| Aforo máximo | Sin límite configurado (`null`) |
| Yape | 964197335 |
| Titular | Joyce Alessandra Valdivia Paredes |
| QR Yape | `public/yape-qr.png` |
| Sitio | `https://openchampionship.illapasystems.com` |

Antes de continuar, escanear el QR con Yape y confirmar que muestra el número y
titular indicados. Si no coincide, **no abrir ventas**.

## 2. Preparación y responsables

- [ ] Definir responsable de Supabase.
- [ ] Definir responsable de Vercel y DNS.
- [ ] Definir responsable del correo.
- [ ] Definir responsable técnico durante el evento y teléfono de emergencia.
- [ ] Confirmar acceso de emergencia a las tres plataformas.
- [ ] Confirmar que `main` contiene los commits aprobados y el worktree no tiene
      cambios de aplicación pendientes.
- [ ] Registrar aquí el commit desplegado: `________________`.

## 3. Supabase de producción

### Creación y configuración

- [x] Crear o identificar el proyecto de producción en la región adecuada.
- [ ] Guardar URL, anon key y `service_role` en el gestor de secretos; nunca en Git.
- [ ] Desactivar el registro público por email.
- [x] Aplicar en orden las migraciones `0001`–`0013` mediante un procedimiento
      revisado. No ejecutar reset remoto.
- [x] Comprobar que existe una sola fila en `evento` y coincide con la sección 1.
- [x] Confirmar que el bucket `comprobantes` existe y es privado.
- [x] Crear el usuario administrador y asignar
      `app_metadata.role = "admin"` desde una herramienta administrativa.

### Prueba de seguridad obligatoria

- [x] Con la anon key, intentar leer `evento`, `registros`, `comprobantes`,
      `entradas`, `email_envios`, `intentos_pin` y `rate_limit_eventos`.
- [x] Confirmar que ninguna tabla devuelve datos.
- [x] Confirmar que `anon` no puede insertar (`42501`, policy RLS).
- [ ] Confirmar que `anon` no puede actualizar/borrar y que `authenticated` no
      puede leer ni escribir tablas de negocio.
- [ ] Confirmar que un comprobante no tiene URL pública.
- [ ] Desde admin, confirmar que la URL firmada del comprobante expira.

Si cualquier prueba RLS o de Storage falla: **NO-GO**.

## 4. Variables de producción en Vercel

Configurar para Production y Preview solo cuando corresponda. No copiar valores
locales de Mailpit ni secretos en variables `NEXT_PUBLIC_*`.

```env
NEXT_PUBLIC_SITE_URL=https://openchampionship.illapasystems.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

EMAIL_SENDING_PROVIDER=
EMAIL_FROM="Entradas <no-reply@illapasystems.com>"
EMAIL_REPLY_TO=
EMAIL_SEND_LIMIT=100

SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
RESEND_API_KEY=

CRON_SECRET=
GUARDIA_PIN=
SESSION_SECRET=
```

- [ ] Elegir un solo proveedor activo: `nodemailer` o `resend`.
- [ ] Usar un `CRON_SECRET` aleatorio e independiente.
- [ ] Usar un `SESSION_SECRET` aleatorio de al menos 32 bytes.
- [ ] Configurar un PIN de puerta de seis dígitos por canal privado.
- [ ] Confirmar que ningún secreto aparece en logs, HTML o bundle del navegador.

## 5. Vercel y dominio

- [ ] Importar el repositorio y seleccionar `main` como rama de producción.
- [ ] Confirmar framework Next.js y comando `npm run build`.
- [ ] Cargar las variables de la sección 4.
- [ ] Desplegar primero en la URL temporal de Vercel.
- [ ] Abrir `/`, `/admin/login`, `/puerta` y `/reenviar` sin errores 5xx.
- [ ] Agregar `openchampionship.illapasystems.com` al proyecto Vercel.
- [ ] Copiar desde Vercel el destino CNAME específico recomendado para el proyecto;
      no asumir un valor genérico si el panel muestra otro.
- [ ] En Namecheap → Domain List → Manage → Advanced DNS, comprobar que no
      exista otro registro con el host `openchampionship`.
- [ ] En Host Records crear: tipo `CNAME Record`, host `openchampionship`, valor
      exacto de Vercel y TTL `Automatic`. Namecheap agrega el dominio al host;
      no escribir `openchampionship.illapasystems.com` en el campo Host.
- [ ] Volver a Vercel y esperar estado de dominio válido.
- [ ] Esperar certificado HTTPS válido.
- [ ] Confirmar que HTTP redirige a HTTPS y que
      `NEXT_PUBLIC_SITE_URL` coincide exactamente con el dominio final.
- [ ] Ejecutar `dig CNAME openchampionship.illapasystems.com +short` y guardar la
      evidencia del destino resuelto.

No emitir entradas reales mientras el dominio final no esté activo: los QR se
construyen con `NEXT_PUBLIC_SITE_URL`.

## 6. Correo y cron

- [ ] Confirmar `EMAIL_REPLY_TO` definitivo.
- [ ] Si se usa Zoho, verificar alias remitente, contraseña de aplicación y TLS.
- [ ] Si se usa Resend, confirmar dominio verificado y API key de producción.
- [ ] Registrar una compra controlada con un correo real autorizado.
- [ ] Confirmar correo de recepción inicial.
- [ ] Confirmar pago desde admin y recibir el correo con todos los QR.
- [ ] Verificar asunto, remitente, Reply-To, imágenes CID y enlaces HTTPS.
- [ ] Repetir recepción en Gmail, Outlook e iCloud.
- [ ] Ejecutar el cron con autorización Bearer correcta y confirmar auditoría.
- [ ] Confirmar que un fallo de correo no revierte el estado del pago.

Si el correo no llega a los tres proveedores, las ventas pueden abrirse solo con
una decisión explícita del organizador y con búsqueda/entrega manual preparada.

## 7. E2E de compra en producción

Usar una operación Yape real controlada. No usar destinatarios `example.test`.

- [ ] Completar datos y cantidad en el paso 1 desde un celular.
- [ ] Confirmar resumen, total, QR, número y titular Yape.
- [ ] Adjuntar comprobante y código real de ocho dígitos.
- [ ] Confirmar correo de recepción y estado `pendiente` en admin.
- [ ] Verificar comprobante mediante URL firmada.
- [ ] Confirmar pago y releer el estado desde la base.
- [ ] Recibir las entradas y abrir cada `/v/<token>`.
- [ ] Confirmar que ver una entrada no la consume.
- [ ] Reenviar entradas desde admin y mediante autoservicio.
- [ ] Repetir el código de operación y comprobar el mensaje amigable.
- [ ] Rechazar o anular la compra controlada según decisión del organizador.

## 8. Puerta y dispositivos

- [ ] Probar `/puerta` únicamente sobre HTTPS.
- [ ] Ingresar el PIN en iPhone/Chrome y Android/Chrome.
- [ ] Confirmar cámara trasera, permiso, enfoque y escaneo.
- [ ] Validar el mismo QR simultáneamente en dos celulares: un solo admitido.
- [ ] Confirmar pantalla verde para admitido y roja para usado/anulado.
- [ ] Probar búsqueda sin mostrar email o celular completo.
- [ ] Precargar, activar modo avión, escanear y sincronizar al recuperar señal.
- [ ] Instalar la PWA o agregarla a inicio en cada dispositivo operativo.

La aceptación detallada continúa en [RUNBOOK_EVENTO.md](./RUNBOOK_EVENTO.md).

## 9. Go / No-Go para abrir ventas

### GO exige

- [ ] Build de producción saludable y dominio HTTPS activo.
- [ ] Migraciones completas y fila `evento` verificada.
- [ ] RLS deny-all y bucket privado comprobados en producción.
- [ ] Compra, comprobante, admin y generación de QR aprobados.
- [ ] Al menos un proveedor de correo real operativo.
- [ ] Cuenta admin y accesos de emergencia disponibles.
- [ ] Organizador aprueba explícitamente abrir ventas.

### NO-GO inmediato

- Exposición de PII, `service_role` o comprobantes.
- QR con dominio incorrecto o consumo no atómico.
- Precio, Yape, fecha o lugar incorrectos.
- Compra que no aparece en admin o confirmación que duplica entradas.
- Imposibilidad de recuperar acceso administrativo.

## 10. Rollback y respuesta inicial

Si aparece un defecto crítico después del despliegue:

1. Detener la difusión del enlace y declarar pausa de ventas.
2. Conservar registros y comprobantes; nunca borrar compras para “reintentar”.
3. Revertir el despliegue en Vercel al último commit aprobado si el defecto es de
   aplicación. No revertir migraciones destructivamente durante la operación.
4. Si el problema es correo, mantener los pagos y usar reintento/admin.
5. Si el problema es puerta, usar búsqueda manual y el CSV seguro.
6. Documentar hora, alcance, compras afectadas y decisión del organizador.

## 11. Cierre de despliegue

| Dato | Valor |
|---|---|
| Commit desplegado | Pendiente |
| URL de producción | Pendiente |
| Fecha/hora del GO | Pendiente |
| Aprobó organizador | Pendiente |
| Aprobó responsable técnico | Pendiente |
| Incidentes conocidos | Pendiente |
