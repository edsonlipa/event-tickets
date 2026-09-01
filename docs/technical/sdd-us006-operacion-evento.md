# SDD US-006 — Cierre operativo del evento

## Alcance

Completar las herramientas que faltan para operar el evento: edición atómica de
cantidad después de confirmar, exportación CSV protegida y un runbook ejecutable.
La prueba in situ, medición y capacitación se documentan, pero requieren al
organizador, el local y los dispositivos reales para su aceptación.

## Edición post-confirmación

- `PATCH /api/admin/registros/[id]` exige sesión y rol admin en el servidor y
  acepta únicamente `cantidadPersonas` entre 1 y 20.
- Una función SQL bloquea el registro durante el ajuste. Al subir, valida aforo e
  inserta entradas nuevas sin modificar QR existentes. Al bajar, nunca permite
  bajar de la cantidad ya usada y anula entradas no usadas, priorizando las que
  no tienen nombre. No elimina filas.
- La anulación registra fecha y admin responsable. Cualquier cambio deja el
  correo pendiente para que el comprador reciba el conjunto vigente de QR.
- Solo los registros `pagado` pueden usar este flujo; pendientes y rechazados no
  se modifican por esta operación.

## Exportación

- `GET /api/admin/export` repite autorización admin y genera el CSV en el
  servidor mediante `service_role`.
- Incluye datos del comprador, pago, correo y conteos de entradas activas, usadas
  y anuladas. Los valores se escapan como CSV y se neutralizan prefijos de
  fórmulas para evitar CSV injection.
- La respuesta no se cachea y se descarga como UTF-8 con BOM.

## Operación y aceptación

- `docs/RUNBOOK_EVENTO.md` contiene preparación, prueba in situ, roles,
  contingencias, cierre y evidencias que deben anotarse.
- La prueba presencial debe cubrir dos celulares, misma luz y señal del local,
  instalación PWA, modo avión, escaneo simultáneo, tiempo por persona y una
  operación completa realizada sin ayuda por organizador y guardia.
- US-006 queda bloqueada mientras esas evidencias y la capacitación no existan;
  los checks automatizados no sustituyen personas ni hardware reales.

## Verificación

1. Un admin puede subir cantidad y se crean solamente los QR faltantes.
2. Al bajar se anulan entradas no usadas sin borrar filas ni tocar una usada.
3. Dos ajustes concurrentes no pierden cambios ni exceden aforo.
4. Un usuario sin rol admin no edita ni exporta.
5. El CSV abre correctamente, refleja conteos y neutraliza fórmulas.
6. Migración local, RLS, typecheck, lint, build y E2E finalizan correctamente.
