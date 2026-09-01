# Runbook operativo — evento 6 de septiembre de 2026

Este documento se completa con nombres, hora, lugar, responsables y teléfonos
reales antes de la prueba presencial. No escribir contraseñas, claves de API ni
el `service_role` aquí.

## Responsables y datos por confirmar

| Dato | Valor |
|---|---|
| Hora de apertura de puertas | Pendiente |
| Hora del evento | Pendiente |
| Lugar y puerta(s) | Pendiente |
| Organizador / teléfono | Pendiente |
| Responsable técnico / teléfono | Pendiente |
| Guardia por dispositivo | Pendiente |
| Número de puertas | Pendiente |

## Prueba presencial — sábado 5

Registrar modelo, navegador y versión de cada celular. Ejecutar con la misma luz,
posición y conectividad que habrá durante el evento.

- [ ] El organizador inicia sesión, revisa un comprobante y confirma el pago sin ayuda.
- [ ] El correo de esa compra llega y muestra todos los QR.
- [ ] Cada guardia abre `/puerta`, ingresa el PIN y permite cámara.
- [ ] La PWA se instala en cada celular; en iPhone se practica “Agregar a inicio”.
- [ ] Cámara trasera, enfoque, linterna disponible y Wake Lock se verifican.
- [ ] Dos celulares escanean el mismo QR a la vez: uno admite y otro muestra usado.
- [ ] En modo avión se abre el shell precargado, se escanea y queda en cola.
- [ ] Al recuperar señal, la cola se sincroniza y la base refleja `usado = true`.
- [ ] La búsqueda por nombre funciona online y degradada sin exponer PII completa.
- [ ] Se repite RLS con la anon key en todas las tablas y devuelve cero datos.
- [ ] Se cronometra una muestra de 10 accesos y se anota promedio y máximo.

### Evidencia

| Métrica | Resultado |
|---|---|
| Dispositivos probados | Pendiente |
| Tiempo promedio por persona | Pendiente |
| Tiempo máximo | Pendiente |
| Calidad de señal por puerta | Pendiente |
| Incidentes y correcciones | Pendiente |
| Aprobación organizador/guardias | Pendiente |

## Noche anterior

- [ ] Confirmar datos finales de `evento`, aforo y hora de expiración del guardia.
- [ ] Confirmar que no queden pagos legítimos en `pendiente`.
- [ ] Confirmar que la cola de correo no tenga errores pendientes.
- [ ] Exportar el CSV y conservarlo en un lugar seguro del organizador.
- [ ] Abrir el escáner en cada celular con red para renovar la precarga.
- [ ] Cargar celulares y power banks al 100%; preparar cables y linternas de clip.
- [ ] Entregar el PIN a los guardias por un canal acordado, no por este documento.
- [ ] Verificar accesos de emergencia a Vercel, Supabase y Resend.

## Apertura de puertas

1. El organizador mantiene `/admin` abierto para compras de última hora.
2. Los guardias mantienen `/puerta/escaner` abierta y confirman “En línea”.
3. Hacer un escaneo de control; anular esa entrada de prueba si corresponde.
4. Dividir filas y dispositivos según el número de puertas confirmado.

## Contingencias

| Situación | Acción inmediata | Escalamiento |
|---|---|---|
| QR no lee | Limpiar lente, mejorar luz y usar búsqueda manual | Cambiar de dispositivo |
| QR ya usado | Verificar hora mostrada y documento del comprador | Organizador decide; no reactivar en puerta |
| Sin red | Continuar en modo degradado sin cerrar la pestaña | Mover un dispositivo a zona con señal para sincronizar |
| Cámara falla | Recargar una vez y revisar permiso | Búsqueda manual; usar celular de reserva |
| Correo no llegó | Buscar comprador y reenviar desde admin | Entregar QR solo tras verificar pago |
| Pago pendiente | Organizador revisa comprobante y monto | Guardia no confirma pagos |
| Servicio caído | Mantener cola offline y búsqueda precargada | Responsable técnico revisa Vercel/Supabase |
| Celular sin batería | Conectar power bank | Reasignar fila al dispositivo de reserva |

Nunca borrar entradas, compartir claves internas ni marcar QR manualmente desde
SQL durante la operación salvo procedimiento de emergencia dirigido por el
responsable técnico.

## Cierre

- [ ] Recuperar conexión en todos los dispositivos y esperar cola vacía.
- [ ] Comparar entradas activas, usadas y anuladas en el CSV final.
- [ ] Exportar respaldo operativo final.
- [ ] Revocar/cambiar el PIN de guardia y cerrar sesiones administrativas.
- [ ] Registrar incidentes, decisiones manuales y pendientes de soporte.
