# SDD US-007 — Proveedores modulares de correo

## Alcance

Separar la composición del correo de su entrega y permitir seleccionar en
configuración `nodemailer` o `resend` sin alterar la cola, los QR CID ni los
flujos de confirmación y reenvío. Nodemailer soportará Mailpit local y Zoho SMTP.

## Contrato

- `EmailSendingProvider` recibe un mensaje normalizado con remitente,
  destinatario, `Reply-To`, HTML y adjuntos inline con CID.
- El adaptador Nodemailer convierte ese contrato a MIME/SMTP.
- El adaptador Resend convierte el mismo contrato a su API HTTP.
- `EMAIL_SENDING_PROVIDER` selecciona `nodemailer` o `resend`; cualquier valor
  desconocido falla cerrado y deja el registro en la cola.

## Configuración

- Variables neutrales: `EMAIL_FROM` y `EMAIL_REPLY_TO`.
- Nodemailer usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` y
  `SMTP_PASS`. Desarrollo permite Mailpit sin autenticación; producción exige
  usuario y contraseña.
- Resend conserva `RESEND_API_KEY`. Durante la transición se admiten
  `RESEND_FROM` y `RESEND_REPLY_TO` como fallback documentado.
- La contraseña de aplicación de Zoho se configura únicamente en `.env.local`
  o en el gestor de secretos del despliegue; nunca se versiona ni se registra.

## Seguridad y confiabilidad

- Todos los módulos comienzan con `import "server-only"`.
- TLS no se degrada: puerto 465 usa TLS directo; 587 exige STARTTLS en
  producción. No se desactiva la validación de certificados.
- Se usan timeouts acotados para que un SMTP inaccesible libere el claim y quede
  disponible para reintento.
- Los errores persistidos eliminan claves conocidas y se limitan a 500
  caracteres.
- La cola e idempotencia existentes siguen siendo la fuente de verdad; un fallo
  de proveedor nunca revierte el pago.

## Verificación

1. Nodemailer entrega en Mailpit el mismo HTML y los mismos QR CID.
2. Una configuración inválida falla sin revertir el pago y el cron reintenta.
3. Resend sigue compilando y puede seleccionarse sin importar Nodemailer en la
   lógica de negocio.
4. Variables SMTP secretas no llegan al navegador ni aparecen en errores.
5. Typecheck, lint, build y toda la suite E2E finalizan correctamente.
6. Zoho se valida con contraseña de aplicación y entrega real autenticada en
   Gmail y Outlook. El 2 de septiembre de 2026 el responsable del producto
   excluyó iCloud del criterio y aceptó observar en producción la clasificación
   inicial de Outlook como correo no deseado.
