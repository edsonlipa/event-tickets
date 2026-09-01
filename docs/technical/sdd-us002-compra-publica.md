# SDD US-002 — Compra pública

## Alcance

Implementar el registro público de compras: formulario, cálculo de monto,
comprobantes de imagen, reserva de aforo y creación de registros pendientes.

## Diseño

- La página pública consulta la única fila de `evento` en el servidor; no se
  incluyen número Yape, precio ni datos del evento en el código.
- `evento.yape_qr_url` permite configurar el QR real del organizador. Es opcional
  en base de datos para no inventar datos de pago; la venta muestra una advertencia
  y degrada al número mientras el cliente no entregue el recurso definitivo.
- Cuando la compra contiene más de una entrada, el formulario envía un nombre
  opcional por posición. La función transaccional crea las entradas recién al
  confirmar el pago; hasta entonces los nombres se conservan como JSON en el
  registro para mantener la correspondencia y evitar tablas provisionales.
- El formulario cliente comprime imágenes a un máximo de 1600 px antes de
  enviarlas como JPEG/WebP/PNG según corresponda. El servidor vuelve a validar
  MIME y tamaño (máximo 5 MiB) sobre el archivo ya comprimido.
- `POST /api/registros` recibe `multipart/form-data`, registra cada comprobante
  en el bucket privado y delega la creación a una función SQL transaccional.
- La función bloquea la fila de `evento`, cuenta entradas activas y reservas
  pendientes recientes y crea el registro solo si no supera el aforo.
- Los límites por IP se guardan en `rate_limit_eventos`; se hashea la IP antes
  de persistirla. El consumo se hace en una función SQL con advisory lock para
  que solicitudes concurrentes no superen el límite por separar conteo e insert.

## Seguridad

- La API no devuelve paths de Storage, comprobantes ni datos de otros registros.
- Todos los accesos a Supabase ocurren server-side con `service_role`.
- Los archivos que ya se hubiesen cargado se eliminan si la transacción rechaza
  la compra por aforo u otra validación.

## Datos aún externos

En producción, el formulario se renderiza solo cuando exista la configuración
definitiva del evento (nombre, número y titular Yape). El seed local es ficticio
y sirve exclusivamente para las pruebas. El QR real sigue siendo un insumo
externo: el código ya admite su asset, pero nunca genera uno sustituto.

## Verificación

1. Una compra de tres entradas queda `pendiente` con imágenes privadas.
2. Los tres nombres opcionales se releen desde la base en el mismo orden.
3. Una imagen grande se reduce a un máximo de 1600 px antes del request.
4. Un archivo inválido o que siga excediendo 5 MiB es rechazado antes de Storage.
5. Dos solicitudes concurrentes no superan el aforo.
6. Más solicitudes que el límite horario por IP reciben HTTP 429.
