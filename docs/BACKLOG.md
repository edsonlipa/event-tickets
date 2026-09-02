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
| US-006 | Como organizador, quiero probar el flujo completo en el local y operar el evento con un runbook. | P0 | Bloqueado | Código, runbook y E2E hechos; compra E2E de producción validada en Mac y iPhone el 2 de septiembre de 2026; falta prueba presencial, puerta en dos celulares y capacitación |
| US-007 | Como operador, quiero elegir Nodemailer/Zoho o Resend sin cambiar el flujo de entradas. | P0 | Hecho | Zoho real entrega en Gmail y Outlook con SPF, DKIM y DMARC; iCloud excluido por decisión del producto |
| US-008 | Como comprador, quiero una interfaz clara y atractiva que conserve toda la seguridad y los datos dinámicos del sistema. | P1 | Hecho | UI móvil revisada; E2E de compra, typecheck, lint y build aprobados |
| US-009 | Como usuario, quiero una experiencia visual coherente en compra, admin y puerta para reconocer y operar el sistema con claridad. | P1 | Hecho | SDD; revisión visual móvil; typecheck, lint y build aprobados |
| US-010 | Como comprador, quiero recibir un acuse con el detalle de mi compra para saber que fue registrada y que la confirmación llegará después. | P0 | Hecho | E2E real confirmado por el operador: ambos correos llegan correctamente |
| US-011 | Como comprador, quiero entender si un código de operación ya fue usado para corregir mi envío sin ver errores internos. | P1 | Hecho | HTTP 409 y mensaje verificados; E2E aislado confirma un solo comprobante persistido |
| US-012 | Como comprador, quiero registrar mis datos y pagar en pasos claros para revisar el monto antes de enviar mis comprobantes. | P0 | Hecho | Flujo productivo confirmado; 8 E2E locales validan UI, API, Storage, concurrencia y relectura desde Supabase |
| US-013 | Como operador, quiero que los correos fallidos se reintenten sin una cuota diaria artificial para recuperar entregas temporales sin duplicarlas. | P0 | Pendiente | SDD; retirar cuota conservando cron, lote técnico, claims y auditoría |

## Convenciones de estado

- `Pendiente`: no se ha iniciado.
- `En progreso`: existe un responsable y, si aplica, un SDD.
- `Bloqueado`: falta una decisión, credencial o insumo externo; describirlo en
  `docs/ESTADO_IMPLEMENTACION.md`.
- `Hecho`: cumple el criterio de aceptación y los checks aplicables.
