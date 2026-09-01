# SDD US-013 — Reintento de correo sin cuota diaria

## Objetivo

Conservar el cron como mecanismo de recuperación ante fallos transitorios del
proveedor de correo, eliminando la lógica de cuota diaria que ya no corresponde
al servicio contratado.

Los correos continúan intentándose inmediatamente al registrar una compra y al
confirmar un pago. El cron no será el camino principal de envío: recuperará
acuses y entradas que hayan quedado pendientes.

## Alcance

- Eliminar del cron el conteo de envíos exitosos del día.
- Retirar `EMAIL_SEND_LIMIT` y el alias legado `RESEND_LIMITE_DIARIO` de la
  configuración y documentación.
- Mantener un máximo técnico fijo por ejecución para acotar duración, memoria y
  solicitudes al proveedor. Este máximo no representa una cuota diaria.
- Procesar primero acuses pendientes y después entradas de compras pagadas.
- Mantener `CRON_SECRET`, `email_envios`, `email_error`, timestamps de intento y
  las funciones atómicas `reclamar_correo_registro` y `reclamar_correo`.
- Mantener el reenvío manual del administrador y el autoservicio existentes.
- No modificar el estado de pago cuando el proveedor de correo falle.

## Fuera de alcance

- Eliminar la auditoría `email_envios`.
- Convertir el cron en el envío principal.
- Reintentos infinitos dentro de una misma solicitud HTTP.
- Webhooks de entrega o rebote del proveedor.
- Cambiar de proveedor de correo.

## Contrato del cron

`GET /api/cron/correos-pendientes` conserva autenticación Bearer mediante
`CRON_SECRET` y responde sin exponer direcciones ni errores sensibles:

```json
{
  "procesados": 2,
  "enviados": 2,
  "fallidos": 0,
  "pendientesRestantes": true
}
```

El lote se reparte entre acuses y entradas sin superar el máximo técnico. Si
quedan pendientes, una ejecución posterior continúa la cola.

## Seguridad e idempotencia

- Las consultas y escrituras continúan exclusivamente con `service_role` en el
  servidor.
- Un registro debe ser reclamado atómicamente antes de enviar para impedir dos
  correos simultáneos del mismo tipo.
- Un fallo libera el claim y registra un error seguro para permitir reintento.
- Los secretos del proveedor nunca aparecen en respuesta, auditoría ni logs.
- RLS permanece deny-all para `anon` y `authenticated`.

## Criterios de aceptación

1. Un correo exitoso se envía inmediatamente y el cron no lo duplica.
2. Un fallo inmediato conserva la compra/pago y queda disponible para reintento.
3. El cron autenticado reintenta el correo pendiente sin consultar una cuota
   diaria ni depender de `EMAIL_SEND_LIMIT`.
4. Dos ejecuciones concurrentes no envían dos veces el mismo correo.
5. El cron sin Bearer válido responde HTTP 401.
6. Cada intento exitoso o fallido queda registrado en `email_envios`.
7. `typecheck`, `lint`, `build` y E2E de correo quedan aprobados.
8. Gmail, Outlook e iCloud reciben los dos tipos de correo en producción.

## Plan de verificación

- Adaptar el E2E actual que simula cuota agotada para comprobar lote técnico y
  reintento sin cuota.
- Simular fallo de transporte, corregir el destinatario y ejecutar el cron.
- Ejecutar dos solicitudes concurrentes al cron y contar un solo envío exitoso.
- Releer `registros` y `email_envios` desde Supabase después de cada acción.
- Confirmar en producción el cron de Vercel y la matriz de proveedores reales.
