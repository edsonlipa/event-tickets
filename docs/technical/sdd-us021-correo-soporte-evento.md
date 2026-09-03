# SDD US-021 — Correo de soporte y dominio oficial

## Estado

Diseño creado el 3 de septiembre de 2026. Implementación pendiente.

## Historia

Como asistente, quiero que todos los mensajes de soporte del evento apunten a
`arakado@illapasystems.com` para poder contactar una dirección real y atendida.

## Decisión

El dominio `illapa.pe` no existe para este producto. El dominio válido es
`illapasystems.com` y el correo de soporte del evento es:

```text
arakado@illapasystems.com
```

## Lugares que deben cambiar

### Configuración productiva

En Vercel, cambiar:

```env
EMAIL_REPLY_TO=arakado@illapasystems.com
```

Esta variable controla simultáneamente:

- la cabecera `Reply-To` del acuse de compra;
- el contacto visible del acuse de compra;
- la cabecera y contacto del correo de rechazo;
- la cabecera y contacto del correo con entradas QR;
- los reintentos automáticos de esos correos.

No hay que duplicar el correo en cada plantilla: `src/lib/mail.ts` ya usa
`EMAIL_REPLY_TO` como fuente única y exige un valor en producción.

### Usuario administrador

`docs/RUNBOOK_PRODUCCION.md` registra actualmente
`arakado@illapa.pe`. Debe reemplazarse por `arakado@illapasystems.com`.

Si el usuario `arakado@illapa.pe` existe en Supabase Auth, la operación debe:

1. crear o actualizar el usuario `arakado@illapasystems.com` con rol `admin`;
2. comprobar el acceso al panel;
3. solo después deshabilitar o eliminar la cuenta antigua.

La contraseña nunca se documenta ni se versiona.

### Dominio web y documentación

Las referencias actuales a `https://openchampionship.illapa.pe` en estado y
runbook contradicen el dominio configurado en Namecheap. Deben corregirse a:

```text
https://openchampionship.illapasystems.com
```

Los lugares afectados son:

- `docs/RUNBOOK_PRODUCCION.md`;
- `docs/ESTADO_IMPLEMENTACION.md`;
- `NEXT_PUBLIC_SITE_URL` en Vercel, si todavía contiene `.illapa.pe`;
- dominio asignado al proyecto Vercel y registro CNAME en Namecheap, si la
  configuración externa también conserva `.illapa.pe`.

Este punto es crítico: `NEXT_PUBLIC_SITE_URL` define la URL codificada dentro de
los QR. Antes de modificarlo se debe confirmar que el dominio
`openchampionship.illapasystems.com` responde por HTTPS. Los QR ya emitidos con
el dominio anterior deben probarse antes de retirar cualquier dominio configurado.

### Documentación de configuración

Actualizar los ejemplos de `EMAIL_REPLY_TO` en:

- `PRD.md`;
- `docs/desarrollo-local.md`;
- `docs/RUNBOOK_PRODUCCION.md`;
- `docs/ESTADO_IMPLEMENTACION.md`.

`.env.local.example` permanece con valor vacío por la regla de no versionar datos
operativos. Se puede añadir un comentario descriptivo, pero no es necesario
hardcodear la dirección.

## Lugares que no deben cambiar

- `EMAIL_FROM="Entradas <no-reply@illapasystems.com>"`: es el remitente, no el
  canal de soporte.
- `SMTP_USER=admin@illapasystems.com`: es una credencial del transporte Zoho;
  solo cambia si el proveedor modifica la cuenta SMTP.
- `entrada-<uuid>@illapasystems.com`: es un identificador CID interno para los QR.
- `soporte@example.test` de Playwright: es un valor aislado de pruebas.
- `admin@email.com` comentado en Supabase: es documentación genérica del servicio.
- `admin@illapasystems.com` en `PieDePagina`: actualmente es un contacto comercial
  para organizadores (“¿Organizas un evento?”), no soporte del comprador. Cambiarlo
  requiere una decisión independiente de producto.

## Implementación propuesta

1. Corregir documentación y ejemplos versionados.
2. Verificar o crear el usuario admin con el correo nuevo en Supabase Auth.
3. Configurar `EMAIL_REPLY_TO` en Vercel para Production, Preview y Development
   según corresponda.
4. confirmar el dominio web oficial y corregir `NEXT_PUBLIC_SITE_URL`, Vercel y
   Namecheap solo si aún apuntan a `.illapa.pe`;
5. desplegar nuevamente;
6. enviar un acuse, un rechazo y un correo de entradas controlados;
7. verificar cabecera `Reply-To` y enlace visible en los tres mensajes;
8. responder uno de los correos y confirmar recepción en
   `arakado@illapasystems.com`.

## Seguridad y riesgos

- No colocar el correo de soporte como `EMAIL_FROM`; se conserva `no-reply` para
  mantener el remitente autenticado y estable.
- Verificar SPF, DKIM y DMARC después del redeploy; el dominio de envío no cambia.
- No retirar un dominio web anterior hasta confirmar que ningún QR emitido queda
  inaccesible.
- No eliminar el admin anterior antes de validar el acceso con la cuenta nueva.
- No imprimir ni versionar claves SMTP, contraseñas o `service_role`.

## Criterios de aceptación

1. Los tres tipos de correo usan `Reply-To: arakado@illapasystems.com`.
2. Los tres cuerpos muestran `arakado@illapasystems.com` como ayuda.
3. Responder un mensaje real llega al buzón correcto.
4. El admin nuevo puede iniciar sesión y conserva el rol requerido.
5. No quedan referencias operativas a `arakado@illapa.pe`.
6. El dominio público y `NEXT_PUBLIC_SITE_URL` usan el dominio oficial confirmado.
7. Los QR emitidos antes del cambio siguen abriendo una entrada válida.
8. Typecheck, lint, build y pruebas de correo aprueban.
