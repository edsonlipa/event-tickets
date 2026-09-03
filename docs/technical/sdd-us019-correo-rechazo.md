# SDD US-019 — Correo de rechazo y liberación del código de operación

## Alcance

Notificar por correo al comprador cuyo registro fue rechazado, con el motivo y
el siguiente paso, y permitir que reintente su compra con el mismo código de
operación cuando su pago Yape es válido.

## Problema

`rechazar_registro` solo cambiaba `status` y guardaba `motivo_rechazo`. El motivo
se mostraba en el detalle del panel, que solo ve el admin. El comprador quedaba
sin aviso tras haber recibido un acuse que le prometía una segunda confirmación.

Al diseñar la salida apareció un defecto mayor: el índice único global sobre
`comprobantes.codigo_operacion` no distinguía el estado del registro, así que un
código usado en una compra rechazada quedaba bloqueado para siempre. El motivo
de rechazo más común es un comprobante ilegible, caso en que el pago **sí** es
válido y el comprador debe reintentar con el mismo código. El correo lo habría
enviado contra un muro.

## Decisiones

- El rechazo sigue siendo terminal. No se agrega una transición de vuelta a
  `pendiente`; el comprador registra una compra nueva.
- El correo usa un marco fijo y el motivo del admin viaja escapado dentro de un
  bloque delimitado. Una nota interna apurada no se convierte en el mensaje
  entero.
- Indica dos caminos: registrar la compra de nuevo (enlace a
  `NEXT_PUBLIC_SITE_URL`) y escribir al contacto si cree que fue un error.
- El envío es automático al rechazar. Un fallo de correo no revierte el rechazo,
  según el invariante de `AGENTS.md`.
- El panel avisa bajo el textarea que ese texto llegará al comprador.

## Unicidad del código de operación

Un índice parcial no puede consultar otra tabla: Postgres rechaza subconsultas
en su predicado (`cannot use subquery in index predicate`). La alternativa
habitual —desnormalizar el estado a una columna de `comprobantes`— crea dos
datos que pueden desincronizarse.

La verificación se movió dentro de `crear_registro`, que ya ejecuta
`select * from evento limit 1 for update`. Como `evento` tiene una sola fila, ese
bloqueo serializa todas las creaciones concurrentes, de modo que la comprobación
es tan atómica como el índice y además puede leer `registros.status`:

```sql
select c.codigo_operacion into v_codigo_repetido
  from public.comprobantes c
  join public.registros r on r.id = c.registro_id
 where r.status <> 'rechazado' and c.codigo_operacion in (...);
```

El índice global se elimina. `rechazar_registro` no se modifica: al cambiar el
estado, el código queda liberado porque la condición se evalúa en la consulta.

Se conserva `errcode = '23505'` para que el manejo del 409 en
`src/app/api/registros/route.ts` siga funcionando sin cambios.

## Estado del correo

No se agregan columnas. `email_envios` ya es el log de envíos por tipo; se
extiende su `CHECK` con `'rechazo'`. La cola de reintento se deriva del log:

```sql
where r.status = 'rechazado'
  and exists     (... tipo = 'rechazo' and not exito)
  and not exists (... tipo = 'rechazo' and exito)
```

Exigir un intento fallido implementa la decisión de no notificar a los rechazos
anteriores a esta migración: sin filas `rechazo` nunca entran a la cola. Evita
un backfill y, sobre todo, evita escribir en la auditoría filas falsas que
afirmen un envío que no ocurrió.

## Verificación

Probado contra Supabase local en transacciones revertidas:

| Caso | Esperado | Resultado |
|---|---|---|
| Código de una compra viva | bloqueado | `23505` |
| Reintento tras rechazo, mismo código | permitido | registro creado |
| Tercero reclama un código ya reintentado | bloqueado | `23505` |

`typecheck`, `lint` y `build` aprobados.

## Pendiente

- Aceptación real: rechazar una compra en producción y confirmar la recepción
  del correo.
- El envío síncrono es el único que crea la fila de auditoría. Si el proceso
  muere antes de registrarla, el cron no reintenta y no hay reenvío manual de
  rechazo en el panel.
