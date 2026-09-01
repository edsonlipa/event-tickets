# SDD US-011 — Código de operación duplicado

## Alcance

Cuando Postgres rechace una compra por el índice único de
`comprobantes.codigo_operacion`, la API pública responderá HTTP 409 con el mensaje
“El código de operación ya fue enviado.”

## Decisiones y seguridad

- Detectar SQLSTATE `23505` y limitar la traducción al constraint
  `comprobantes_codigo_operacion_uniq`.
- No exponer mensajes, nombres de tablas ni detalles internos de Postgres.
- Conservar la limpieza compensatoria de archivos subidos antes del rechazo.
- Otros conflictos y errores mantienen su tratamiento actual.

## Verificación

- Enviar dos compras con el mismo código: primera 201, segunda 409 y mensaje claro.
- Confirmar que el segundo intento no deja registro ni archivo huérfano.
- Ejecutar typecheck, lint y build.
