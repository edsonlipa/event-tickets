# SDD US-025 — Fallos de correo visibles en el panel

## Alcance

Que el administrador se entere de que un correo no llegó, sin abrir cada
registro y sin interpretar jerga de proveedor.

## Problema

El panel consulta hoy `email_enviado` y `email_error` (`src/lib/admin-data.ts:30`),
que corresponden **solo** al correo de entradas con QR. Quedan fuera:

- la confirmación de registro (`email_registro_enviado`, `email_registro_error`);
- el correo de rechazo, cuyo estado vive en `email_envios` con `tipo = 'rechazo'`.

Además, `AccionesRegistro.tsx:52` solo muestra el error cuando el registro está
en `pagado`. Una confirmación de registro fallida sobre una compra pendiente es hoy invisible: el
comprador pagó, no recibió confirmación de que su compra llegó, y nadie en el
panel puede saberlo.

La grilla tampoco distingue nada, así que detectar un fallo exige abrir los
registros uno por uno.

## Decisiones

1. **Dónde.** Distintivo en la grilla para detectarlo de un vistazo y detalle
   completo al entrar.
2. **Alcance.** Los tres tipos: confirmación de registro, entradas y rechazo.
3. **Mensaje.** Causa traducida a lenguaje operativo, con el texto crudo del
   proveedor disponible para diagnóstico.
4. **Acción.** Solo mostrar. El cron ya reintenta los tres tipos
   (`api/cron/correos-pendientes`), así que el panel informa para que el
   operador decida si llamar al comprador; no duplica el reintento.

## Traducción de causas

El objetivo es que el operador sepa **si esperar o actuar**:

| Señal del proveedor | Qué se muestra | Qué implica |
|---|---|---|
| `550 5.1.1`, `mailbox not found` | La dirección no existe | Llamar al comprador: se equivocó al escribirla |
| `550 5.7.x`, `blocked`, `spam` | El servidor del destinatario lo rechazó | Reputación o filtro; puede requerir otro canal |
| `552`, `quota exceeded` | El buzón está lleno | El comprador debe liberar espacio |
| `421`, `4.x.x`, `timeout`, `ECONN*` | Problema temporal | Esperar: el cron lo reintenta |
| `domain not verified`, `rate limit` | Configuración del proveedor | Revisar Zoho o Resend, no es culpa del comprador |
| cualquier otra | No se pudo enviar | Mostrar el texto crudo |

La distinción que más importa es entre **temporal** y **permanente**: un fallo
temporal se resuelve solo y no merece una llamada; uno permanente no se va a
arreglar por más que el cron reintente.

## Datos que faltan en el panel

`admin-data.ts` debe incorporar a su selección:

```
email_registro_enviado, email_registro_error,
email_intento_at, email_registro_intento_at
```

Y para el rechazo, consultar `email_envios` filtrando `tipo = 'rechazo'` sin un
envío exitoso posterior, que es la misma condición que ya usa
`rechazos_con_correo_pendiente`.

## Aceptación

- Un registro con la confirmación de registro fallida se distingue en la grilla, esté en el estado que
  esté.
- El detalle nombra la causa en lenguaje operativo y permite ver el texto crudo.
- Un fallo temporal y uno permanente se leen distinto.
- Un registro sin problemas no muestra nada: el distintivo debe significar algo.
- `typecheck`, `lint` y `build` aprobados.

## Fuera de alcance

Reintento manual desde el panel. El correo de entradas ya tiene su botón de
reenvío; confirmación de registro y rechazo se dejan al cron por decisión explícita.
