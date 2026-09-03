# SDD US-018 — Edición progresiva de cantidad

## Objetivo

Evitar cambios accidentales en una compra pagada y explicar al administrador
cuándo corresponde modificar su cantidad de entradas.

## Interacción

- La vista inicial muestra la cantidad actual, una explicación operativa y el
  botón `Modificar número de entradas`.
- El campo numérico no aparece hasta que el administrador activa ese botón.
- El modo de edición ofrece `Guardar cambios` y `Cancelar`.
- Guardar conserva el endpoint y la operación atómica existentes. Tras una
  respuesta exitosa, se cierra el editor y se refrescan los datos del servidor.
- Cancelar descarta la selección local sin enviar una solicitud.

## Información operativa

La interfaz indica que esta acción sirve para corregir una compra ya confirmada,
que aumentar genera QR nuevos, que reducir anula únicamente QR no usados y que
después debe reenviarse el correo al comprador.

## Seguridad y datos

No cambia el contrato del servidor ni el esquema. El `PATCH` continúa exigiendo
un admin autenticado, cantidad de 1 a 20 y la función SQL atómica.

## Verificación

- Confirmar que el selector no sea visible inicialmente.
- Abrir el editor, escoger otra cantidad y guardar.
- Confirmar que cancelar no haga ningún `PATCH`.
- Ejecutar typecheck, lint, build y el E2E administrativo aplicable.
