# Backlog de implementación

Este archivo convierte el PRD en unidades de trabajo y conserva el estado real.
Cada historia referencia el criterio de aceptación del PRD; no lo duplica.

| ID | Historia | Prioridad | Estado | Referencia |
|---|---|---|---|---|
| US-001 | Como equipo, quiero un entorno local reproducible con Next.js y Supabase para desarrollar y verificar sin servicios reales. | P0 | Hecho | PRD §6, día 1 |
| US-002 | Como comprador, quiero registrar mi compra Yape y sus comprobantes para que el admin pueda validarla. | P0 | Hecho | PRD §6, día 2; E2E de aceptación |
| US-003 | Como admin, quiero revisar y confirmar pagos de forma eficiente para emitir entradas sin duplicados. | P0 | Hecho | PRD §6, día 3; SDD y E2E US-003 |
| US-004 | Como comprador, quiero recibir y reenviar mis entradas QR por correo para poder acceder al evento. | P0 | Bloqueado | Código y E2E hechos; falta validación real Gmail/Outlook/iCloud |
| US-005 | Como guardia, quiero validar QR y buscar asistentes aun con conectividad degradada para controlar la puerta. | P0 | Bloqueado | Código y E2E hechos; falta aceptación en dos celulares reales y modo avión |
| US-006 | Como organizador, quiero probar el flujo completo en el local y operar el evento con un runbook. | P0 | Pendiente | PRD §6 y §8, días 6–7 |

## Convenciones de estado

- `Pendiente`: no se ha iniciado.
- `En progreso`: existe un responsable y, si aplica, un SDD.
- `Bloqueado`: falta una decisión, credencial o insumo externo; describirlo en
  `docs/ESTADO_IMPLEMENTACION.md`.
- `Hecho`: cumple el criterio de aceptación y los checks aplicables.
