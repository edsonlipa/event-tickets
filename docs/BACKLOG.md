# Backlog de implementación

Este archivo convierte el PRD en unidades de trabajo y conserva el estado real.
Cada historia referencia el criterio de aceptación del PRD; no lo duplica.

| ID | Historia | Prioridad | Estado | Referencia |
|---|---|---|---|---|
| US-001 | Como equipo, quiero un entorno local reproducible con Next.js y Supabase para desarrollar y verificar sin servicios reales. | P0 | Hecho | PRD §6, día 1 |
| US-002 | Como comprador, quiero registrar mi compra Yape y sus comprobantes para que el admin pueda validarla. | P0 | Hecho | PRD §6, día 2; E2E de aceptación |
| US-003 | Como admin, quiero revisar y confirmar pagos de forma eficiente para emitir entradas sin duplicados. | P0 | Hecho | PRD §6, día 3; SDD y E2E US-003 |
| US-004 | Como comprador, quiero recibir y reenviar mis entradas QR por correo para poder acceder al evento. | P0 | Hecho | Gmail recibió los QR y Outlook aceptó el correo autenticado; riesgo de spam aceptado e iCloud excluido por producto |
| US-005 | Como guardia, quiero validar QR y buscar asistentes aun con conectividad degradada para controlar la puerta. | P0 | Bloqueado | Código y E2E hechos; falta aceptación en dos celulares reales y modo avión |
| US-006 | Como organizador, quiero probar el flujo completo en el local y operar el evento con un runbook. | P0 | Bloqueado | Código, runbook y E2E hechos; compra E2E de producción validada en Mac y iPhone el 2 de septiembre de 2026; falta prueba presencial, puerta en dos celulares y capacitación |
| US-007 | Como operador, quiero elegir Nodemailer/Zoho o Resend sin cambiar el flujo de entradas. | P0 | Hecho | Zoho real entrega en Gmail y Outlook con SPF, DKIM y DMARC; iCloud excluido por decisión del producto |
| US-008 | Como comprador, quiero una interfaz clara y atractiva que conserve toda la seguridad y los datos dinámicos del sistema. | P1 | Hecho | UI móvil revisada; E2E de compra, typecheck, lint y build aprobados |
| US-009 | Como usuario, quiero una experiencia visual coherente en compra, admin y puerta para reconocer y operar el sistema con claridad. | P1 | Hecho | SDD; revisión visual móvil; typecheck, lint y build aprobados |
| US-010 | Como comprador, quiero recibir una confirmación de registro con el detalle de mi compra para saber que fue registrada y que las entradas llegarán después. | P0 | Hecho | E2E real confirmado por el operador: ambos correos llegan correctamente |
| US-011 | Como comprador, quiero entender si un código de operación ya fue usado para corregir mi envío sin ver errores internos. | P1 | Reemplazada | Antecedente histórico reemplazado por US-020 al retirar el código de operación de compras nuevas |
| US-012 | Como comprador, quiero registrar mis datos y pagar en pasos claros para revisar el monto antes de enviar mis comprobantes. | P0 | Hecho | Flujo productivo confirmado; 8 E2E locales validan UI, API, Storage, concurrencia y relectura desde Supabase |
| US-013 | Como operador, quiero que los correos fallidos se reintenten sin una cuota diaria artificial para recuperar entregas temporales sin duplicarlas. | P0 | En progreso | Implementación y E2E local; falta ejecutar el cron productivo con Bearer |
| US-014 | Como operador, quiero que todas las fechas y horas usen la zona de Perú para operar correctamente sin importar la configuración del servidor, la base o el dispositivo. | P0 | Hecho | UTC/`timestamptz`; formatos `America/Lima`; unitarias multi-TZ y 21 E2E aprobados |
| US-015 | Como guardia, quiero ver el nombre y la hora de ingreso en los resultados PASA y NO PASA para validar cada acceso con claridad. | P1 | En progreso | Implementación, migración y 5 E2E locales aprobados; falta aplicar 0014 y validar en producción |
| US-016 | Como asistente, quiero ver el QR dentro de mi entrada pública para poder presentarlo desde el enlace. | P1 | Hecho | QR canónico visible; URL real verificada localmente sin consumir la entrada; typecheck, lint y build aprobados |
| US-017 | Como asistente, quiero ver la fecha y hora del evento con un formato uniforme para identificar claramente cuándo asistir. | P1 | Hecho | `06 de setiembre 2026` en `es-PE` y hora de Lima; unitarias multi-TZ, typecheck, lint y build aprobados |
| US-018 | Como admin, quiero activar explícitamente la edición de entradas y entender cuándo usarla para evitar ajustes accidentales. | P1 | Hecho | Edición en dos etapas, explicación, guardar y cancelar; 6 E2E admin, typecheck, lint y build aprobados |
| US-019 | Como comprador rechazado, quiero recibir un correo con el motivo y el siguiente paso para corregir mi compra sin tener que preguntar. | P0 | En progreso | SDD; correo automático con marco fijo y orientación para adjuntar un comprobante claro; falta aceptación real en producción |
| US-020 | Como comprador, quiero registrar mi comprobante sin ingresar el código de operación para completar la compra con menos fricción. | P0 | Hecho | Migración 0016; códigos históricos visibles/buscables; 22 E2E, RLS, typecheck, lint y build aprobados |
| US-021 | Como asistente, quiero que el soporte del evento use `arakado@illapasystems.com` para contactar una dirección real y atendida. | P0 | Pendiente | SDD; requiere actualizar `EMAIL_REPLY_TO`, admin y referencias operativas a `illapa.pe`, con validación real de respuesta |
| US-021 | Como asistente, quiero recibir mi entrada con el arte oficial del evento para reconocerla y compartirla, sin perder la lectura del QR en puerta. | P2 | En progreso | Implementada en correo y `/v/[token]`; 19,4 KB por entrada y 55,4 kB el correo con dos; QR leído con `jsqr`; typecheck, lint y build aprobados; falta prueba en celulares reales |
| US-023 | Como guardia, quiero que el escáner responda siempre al leer un QR aunque el navegador bloquee el almacenamiento, para no quedarme sin saber si la persona pasa. | P0 | En progreso | Las cuatro escrituras pasan por `guardarLocal`; `mostrar()` ya no depende de que persistan y un aviso rojo pide anotar a mano; typecheck, lint y build aprobados; falta prueba en los dos celulares |
| US-025 | Como admin, quiero ver en el panel si un correo no se envió y por qué, para decidir si contacto al comprador o espero el reintento. | P1 | Hecho | Cubre confirmación de registro, entradas y rechazo; distintivo en grilla, causa traducida y detalle técnico plegable; `npm run datos:fallos-correo` carga 8 casos de prueba; typecheck, lint y build aprobados |
| US-026 | Como operador, quiero enviar las entradas por WhatsApp desde el detalle para entregarlas cuando el correo no llega. | P1 | Hecho | SDD; enlace `wa.me` con el celular normalizado y una URL por línea; mensaje real recibido en WhatsApp con enlaces tocables usando el dominio de producción; 7 unitarias y 25 E2E aprobados |
| US-027 | Como admin, quiero tener a la mano el enlace de cada entrada de una compra confirmada para entregarlo por el canal que haga falta. | P1 | Hecho | SDD; el bloque va antes de los comprobantes y cada entrada tiene botón de copiar con respaldo sin HTTPS; posición verificada en 1280×900 y 390×844; 25 E2E aprobados |

## Convenciones de estado

- `Pendiente`: no se ha iniciado.
- `En progreso`: existe un responsable y, si aplica, un SDD.
- `Bloqueado`: falta una decisión, credencial o insumo externo; describirlo en
  `docs/ESTADO_IMPLEMENTACION.md`.
- `Hecho`: cumple el criterio de aceptación y los checks aplicables.
- `Reemplazada`: una decisión posterior retiró el comportamiento, conservando su
  historia y documentación como antecedente.
