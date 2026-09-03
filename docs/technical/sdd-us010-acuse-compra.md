# SDD US-010 — Acuse inmediato de compra

## Alcance

Al registrar una compra se envía un primer correo con sus detalles y el estado
pendiente. Este correo no contiene entradas ni QR: explica que el comprador
recibirá un segundo correo cuando el administrador confirme el pago.

## Flujo e idempotencia

1. La compra y sus comprobantes se guardan transaccionalmente.
2. Se reclama el envío del acuse con un campo de claim independiente.
3. Se intenta enviar y se responde con el ID de compra aunque el transporte falle.
4. Los fallos quedan en una cola independiente y el cron los reintenta.
5. Confirmar el pago conserva el correo de entradas y sus estados actuales.

## Datos

`registros` agrega estado, fecha, error y claim propios para el acuse. `email_envios`
agrega `tipo` (`registro_recibido` o `entradas`) para auditoría compartida.
El correo muestra nombre del evento, comprador, cantidad, precio unitario, monto
total, fecha, lugar y código de registro; no adjunta comprobantes ni PII adicional.

## Seguridad

- La plantilla y el transporte permanecen en módulos `server-only`.
- Un fallo de correo nunca elimina ni revierte la compra.
- Los errores se normalizan sin credenciales.
- El cron comparte la autenticación y el lote técnico definidos por US-013.

## Verificación

- Registrar una compra real y comprobar que llega el acuse sin QR.
- Confirmarla y comprobar que llega un segundo correo con los QR.
- Forzar un fallo: la compra persiste y el cron reintenta el acuse.
- Ejecutar typecheck, lint, build y E2E en Mailpit; aceptación final con correo real.
