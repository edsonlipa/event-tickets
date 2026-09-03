# SDD US-017 — Fecha y hora uniformes

## Objetivo

Mostrar la fecha del evento como `06 de setiembre 2026` en todo lugar visible y
agregar fecha y hora a la entrada pública `/v/[token]`.

## Decisiones

- `src/lib/fecha.ts` continúa siendo la única fuente para formatear tiempos.
- `formatearFecha` devuelve solo la fecha humana con día de dos dígitos.
- `formatearFechaHora` compone esa fecha con `formatearHora` cuando la vista necesita
  ambos valores.
- Compra, correos, detalle administrativo y entrada pública usan el formato
  compuesto; el CSV conserva su formato operativo ordenable.
- Todos los cálculos se realizan explícitamente en `America/Lima`.

## Seguridad y datos

No cambia el esquema ni se persisten valores formateados. La fecha sigue viniendo
de `evento` y los timestamps siguen almacenados como `timestamptz`.

## Verificación

- Probar el resultado exacto de fecha, hora y fecha-hora bajo UTC, Tokio y Auckland.
- Revisar que `/v/[token]` muestre fecha y hora sin consumir la entrada.
- Ejecutar typecheck, lint y build.
