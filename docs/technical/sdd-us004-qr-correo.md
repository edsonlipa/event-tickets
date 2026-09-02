# SDD US-004 — QR, correo y reenvíos

## Alcance

Generar los QR de entradas, enviar un correo por compra con imágenes CID,
desacoplar pago y entrega, reintentar fallos mediante cron, permitir reenvío
administrativo y autoservicio, y publicar la landing de lectura nativa del QR.

## Transporte y contenido

- `lib/qr.ts` genera PNG en servidor. Cada QR contiene
  `${NEXT_PUBLIC_SITE_URL}/v/${entrada.id}`; nunca el UUID aislado.
- El correo contiene una tarjeta por entrada y adjunta cada PNG con un CID único.
  El HTML referencia `cid:<id>` y no usa `data:` URI.
- El transporte implementa `EmailSendingProvider`: Nodemailer usa SMTP hacia
  Mailpit/Zoho y Resend usa su API. Ambos comparten asunto, HTML, remitente,
  `Reply-To` y adjuntos.
- El correo de contacto se muestra también en el cuerpo.

## Cola e idempotencia

- Confirmar un pago devuelve primero el estado pagado y luego intenta el correo.
  Un fallo nunca revierte `status = 'pagado'`.
- `email_intento_at` reclama atómicamente un envío durante diez minutos para
  evitar duplicados por doble clic o dos ejecuciones del cron.
- En éxito se fijan `email_enviado`, `email_enviado_at` y se limpia el error. En
  fallo se conserva `email_enviado = false`, se guarda `email_error` y se libera
  el claim para un reintento posterior.
- El cron respeta `EMAIL_SEND_LIMIT`, procesa únicamente pagos pendientes de
  correo y exige `Authorization: Bearer <CRON_SECRET>`.

## Reenvíos

- El admin puede forzar un nuevo envío; si falla queda en la cola.
- `/reenviar` responde siempre el mismo mensaje exista o no el correo. Aplica
  rate limit atómico tanto al hash de IP como al hash del email.
- El autoservicio solo considera registros pagados; nunca confirma si un email
  pertenece a un comprador.

## Landing QR

- `/v/[token]` muestra evento, nombre de la entrada y estado informativo.
- La ruta nunca modifica `usado`; el consumo queda reservado a US-005.
- Un UUID inexistente usa una respuesta genérica y no expone otros datos.

## Seguridad

- Todos los módulos de correo, QR y datos comienzan con `import "server-only"`.
- Ningún secreto, token ajeno, comprobante ni lista de compradores llega al
  navegador.
- Los errores persistidos se normalizan para no almacenar credenciales ni
  respuestas completas del proveedor.

## Verificación

1. Confirmar una compra crea N entradas y Mailpit recibe un correo con N imágenes CID.
2. El QR decodifica a `/v/<uuid>` y la landing no marca la entrada como usada.
3. Forzando un fallo, el pago queda pagado con `email_error`; el cron lo envía al
   restaurar el transporte.
4. Reenvío admin funciona y autoservicio responde igual para email existente o no.
5. Cron sin secreto devuelve 401 y respeta la cuota diaria.
6. Typecheck, lint, build, E2E y RLS finalizan correctamente.
7. La aceptación externa se cerró el 2 de septiembre de 2026 con QR real en
   Gmail y entrega en Outlook con SPF, DKIM y DMARC aprobados. El responsable
   del producto excluyó iCloud y aceptó monitorear el riesgo de spam en Outlook.
