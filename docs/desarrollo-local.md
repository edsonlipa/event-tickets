# Desarrollo local

El entorno local usa la CLI oficial de Supabase, declarada como dependencia de
desarrollo. La CLI levanta en Docker Postgres, Auth, Storage, Studio y el buzón
de correo local.

## Requisitos

- Docker Desktop en ejecución.
- Node.js 22 o posterior.
- Dependencias instaladas con `npm install`.

## Arranque

En dos terminales, desde la raíz del proyecto:

```bash
cp .env.local.example .env.local
# Completar NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY
# con `npm run supabase:status`.
npm run supabase:start
npm run dev
```

Al detener el entorno:

```bash
npm run supabase:stop
```

La primera ejecución descarga las imágenes de Docker. Consultar puertos, claves
locales y URLs con `npm run supabase:status`.

El API local usa `http://127.0.0.1:55421`, Studio
`http://127.0.0.1:55423` y Postgres `127.0.0.1:55422`.

## Correo local

La app debe seleccionar el transporte por entorno:

| Entorno | Transporte | Destino |
|---|---|---|
| Desarrollo | Nodemailer/SMTP | Buzón local de Supabase, host `127.0.0.1`, puerto `55425` |
| Producción | Configurable | Nodemailer con Zoho SMTP o API de Resend |

El buzón de Auth se abre en la URL indicada por `npm run supabase:status`
(en este proyecto, <http://127.0.0.1:55424>). La app usa el puerto SMTP local 55425.
`supabase/config.toml` expone ese puerto mediante `local_smtp.smtp_port`.

Nunca usar claves reales de Resend en el entorno local. Los correos de prueba se
inspeccionan en el buzón local de Supabase y los correos de producción se prueban
únicamente en el entorno desplegado.

US-004 usa `EMAIL_SENDING_PROVIDER=nodemailer` en local. Una confirmación debe aparecer en
Mailpit con los QR bajo `Inline`, un `Content-ID` por entrada y el `Reply-To`
configurado. El cron local requiere `CRON_SECRET`; en Vercel se ejecuta diariamente
a las 14:00 UTC (09:00 en Lima) según `vercel.json`.

Las variables comunes de producción son `EMAIL_FROM`, `EMAIL_REPLY_TO`,
`EMAIL_SEND_LIMIT` y `CRON_SECRET`. Con Resend se selecciona `resend` y se define
`RESEND_API_KEY`. Con Zoho se selecciona `nodemailer` y se configuran los campos
SMTP descritos abajo. La historia no se considera terminada hasta comprobar
recepción y QR visibles en Gmail, Outlook e iCloud.

### Zoho SMTP

No versionar ni compartir la contraseña de aplicación. El host exacto se copia
del panel de la cuenta Zoho; para una organización paga suele ser
`smtppro.zoho.com`. Configuración esperada para TLS directo:

```env
EMAIL_SENDING_PROVIDER=nodemailer
EMAIL_FROM="Entradas <no-reply@illapasystems.com>"
EMAIL_REPLY_TO=admin@illapasystems.com
SMTP_HOST=smtppro.zoho.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@illapasystems.com
SMTP_PASS=contraseña-de-aplicacion
```

`no-reply@illapasystems.com` debe figurar en Zoho como alias autorizado del
usuario autenticado. Para puerto 587 usar `SMTP_SECURE=false`; producción exige
STARTTLS automáticamente.

## Datos de compra provisionales

`supabase/seed.sql` carga datos ficticios para probar US-002. El QR recibido está
en `public/yape-qr.png` y la migración 0011 configura `evento.yape_qr_url`. El
asset es un recorte directo, sin reescalado ni regeneración del patrón.

## Usuario administrador

El panel está en `/admin/login`. Solo admite usuarios de Supabase Auth cuyo
`app_metadata.role` sea `admin`; una cuenta autenticada sin ese rol no accede a
datos ni acciones administrativas.

En local, crear el usuario desde Studio → Authentication y asignar el rol desde
el SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

En producción, crear las cuentas desde el panel de Supabase y mantener desactivado
el registro público por email. Nunca promover un usuario desde el navegador.

## Puerta y PWA

La vista del guardia está en `/puerta`. En local se deben definir `GUARDIA_PIN`
(4–6 dígitos) y un `SESSION_SECRET` aleatorio de al menos 32 caracteres. El PIN se
canjea por una cookie firmada y nunca se persiste en el navegador.

La sesión expira provisionalmente al terminar el 6 de septiembre en Lima; hay que
ajustarla cuando el organizador confirme la hora final. Abrir `/puerta/escaner`
con conexión una vez para precargar la lista y el shell. Después se puede probar
la búsqueda y cola degradada activando modo avión; al recuperar conexión, la cola
se sincroniza con el endpoint atómico.

Las pruebas automatizadas simulan concurrencia y falta de red, pero no sustituyen
la aceptación con dos celulares reales, cámara, linterna e instalación PWA.

Para abrir el servidor de desarrollo desde un teléfono en la red local, la IP del
equipo debe figurar en `allowedDevOrigins` de `next.config.ts` y se debe reiniciar
`next dev` después de modificarla. La sesión PIN puede probarse por HTTP, pero la
cámara requiere un contexto seguro: usar el despliegue HTTPS para la aceptación
móvil. `http://<ip-lan>:3000` no habilita `getUserMedia` en iPhone ni Chrome.

## Cierre operativo

El detalle de una compra pagada permite ajustar su cantidad. El aumento genera
entradas nuevas; la reducción anula entradas no usadas sin borrar auditoría. El
panel ofrece `Exportar CSV`, protegido por la misma sesión admin.

La preparación y aceptación presencial se ejecutan desde
`docs/RUNBOOK_EVENTO.md`. Sus campos pendientes deben completarse con datos reales
antes del evento; no colocar secretos ni contraseñas dentro del documento.
