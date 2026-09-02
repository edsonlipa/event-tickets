# SDD US-015 — Feedback de ingreso en puerta

## Estado

Pendiente de implementación y verificación.

## Historia

Como guardia, quiero ver el nombre de la persona y la hora asociada al escaneo
para confirmar visualmente quién ingresa y distinguir un ingreso válido de una
entrada utilizada anteriormente.

## Objetivo

Hacer que la respuesta principal del escáner comunique, con texto grande y
legible, el resultado, la identidad mínima permitida y la hora de ingreso usando
el timestamp autoritativo del servidor.

## Comportamiento esperado

### Entrada admitida

- Estado verde `PASA`.
- Nombre de la persona; si no fue asignado, nombre del comprador.
- Texto `Ingreso registrado a las 9:43 a. m.`.
- La hora proviene del `usado_at` persistido por la operación atómica, no del reloj
  del celular.

### Entrada usada anteriormente

- Estado rojo `NO PASA`.
- Nombre de la persona; si no fue asignado, nombre del comprador.
- Motivo explícito `Entrada ya utilizada`.
- Texto `Ingreso registrado a las 9:43 a. m.` con la hora del primer ingreso.

### Entrada anulada o inexistente

- Estado rojo `NO PASA`.
- Motivo explícito `Entrada anulada` o `Entrada no válida`.
- No se inventa ni muestra una hora de ingreso cuando no existe.
- El nombre solo se presenta si el servidor puede devolverlo sin ampliar la PII
  autorizada para puerta.

## Decisiones técnicas

1. La función atómica de consumo devuelve un timestamp de ingreso tanto al ganar
   el update como al encontrar una entrada ya usada.
2. El contrato de la API usa un único campo de hora de ingreso y un nombre de
   presentación con fallback controlado en el servidor.
3. La UI formatea el timestamp mediante la utilidad central de fecha de US-014 en
   `America/Lima`.
4. La lectura rápida duplicada se mantiene como `NO PASA`; una mejora visual para
   distinguir dobles lecturas por pocos segundos podrá definirse por separado.
5. No se exponen email, celular completo, comprobantes ni otros datos del comprador.

## Seguridad y concurrencia

- Se conserva el consumo atómico: obtener la hora no separa la lectura de `usado`
  de su actualización.
- El servidor es la única fuente del resultado y de `usado_at`.
- La cola offline sigue siendo idempotente; al sincronizar debe mostrar la hora
  confirmada por el servidor cuando esté disponible.
- RLS y autenticación de puerta no cambian.

## Criterios de aceptación

1. Al escanear una entrada nueva, aparece `PASA`, el nombre correspondiente y
   `Ingreso registrado a las h:mm a. m./p. m.`.
2. La fila queda con `usado = true` y la hora mostrada coincide con `usado_at` en
   Supabase, presentada en `America/Lima`.
3. Al escanear otra vez el mismo QR, aparece `NO PASA`, el mismo nombre, `Entrada
   ya utilizada` y la hora exacta del primer ingreso.
4. Una entrada sin `nombre_persona` muestra el nombre del comprador sin exponer su
   email ni celular completo.
5. Entradas anuladas o inexistentes muestran `NO PASA` y su motivo sin una hora
   falsa.
6. Dos escaneos concurrentes producen exactamente un `PASA` y un `NO PASA`; ambos
   referencian el mismo timestamp de ingreso persistido.
7. El resultado es legible en viewport móvil y funciona con el navegador emulado
   en una zona horaria distinta de Perú.
8. Aprueban las pruebas de puerta aplicables, `npm run typecheck`, `npm run lint`
   y `npm run build`.

## Verificación

- Prueba SQL de consumo inicial, repetido, anulado e inexistente.
- Prueba de concurrencia sobre el mismo token.
- Prueba de contrato de `/api/puerta/marcar` sin PII adicional.
- Prueba de UI para `PASA` y las variantes de `NO PASA`.
- Relectura del registro desde Supabase para comparar el timestamp mostrado.
