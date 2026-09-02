# SDD US-014 — Zona horaria única de Perú

## Estado

Pendiente de implementación y verificación.

## Historia

Como operador, quiero que todas las fechas y horas se interpreten y presenten en
la zona horaria de Perú para que el sistema sea consistente sin importar la zona
horaria del servidor, la base de datos o el dispositivo del usuario.

## Objetivo

Verificar y completar el tratamiento transversal del tiempo. Los instantes se
almacenan como `timestamptz` y se transportan en ISO 8601; toda fecha u hora
destinada a una persona se presenta explícitamente en `America/Lima`.

No se cambiará la zona horaria global de Postgres, Vercel ni del dispositivo. La
aplicación debe ser correcta aunque esos entornos estén configurados en UTC o en
otra zona.

## Alcance

- Auditar columnas, funciones SQL, consultas, APIs, correos, CSV y vistas que
  crean, comparan o presentan fechas.
- Centralizar el formato humano en una utilidad compartida configurada con
  `America/Lima`; evitar `toLocaleString` sin `timeZone` explícita.
- Mantener en `timestamptz` los instantes de evento, registro, confirmación,
  correo, consumo de entrada, anulación y rate limit.
- Definir los límites de "hoy" y cualquier ventana operativa con semántica de
  Perú, no con la fecha local del servidor.
- Mostrar la hora de ingreso de una entrada en hora peruana cuando corresponda.
- Documentar en el runbook cómo verificar la zona horaria antes de producción.

## Fuera de alcance

- Convertir timestamps almacenados a texto o a `timestamp without time zone`.
- Permitir que cada usuario elija una zona horaria.
- Cambiar la fecha u hora oficial del evento.

## Decisiones técnicas

1. `America/Lima` es la fuente de verdad para calendario y presentación.
2. La base conserva instantes absolutos mediante `timestamptz`; normalmente se
   serializan en UTC y solo se convierten al presentar o calcular un día civil.
3. Las APIs devuelven timestamps ISO 8601 con offset; el navegador no decide la
   zona de negocio.
4. Los cálculos SQL dependientes de un día usan una conversión explícita a
   `America/Lima` o reciben límites calculados explícitamente para esa zona.
5. Las pruebas cambian deliberadamente `TZ` en servidor y navegador para detectar
   dependencias accidentales del entorno.

## Seguridad y datos

Este cambio no modifica el modelo de autorización, RLS ni la exposición de PII.
Las respuestas de puerta conservan los datos mínimos actuales. Las migraciones,
si fueran necesarias, no relajarán policies ni convertirán columnas
`timestamptz` a tipos sin zona.

## Criterios de aceptación

1. El evento del 6 de septiembre de 2026 a las 9:00 a. m. se muestra exactamente
   así al ejecutar el servidor bajo `TZ=UTC` y bajo una zona con otro offset.
2. Un mismo timestamp de ingreso se muestra con la misma fecha y hora de Perú en
   compra, admin, puerta, entrada pública, correo y exportación donde aplique.
3. Cerca de la medianoche peruana, los contadores y filtros definidos como
   "hoy" incluyen exclusivamente el intervalo civil de `America/Lima`.
4. La hora de un ingreso ya utilizado proviene del timestamp del servidor y se
   presenta en `America/Lima`, independientemente de la zona del celular.
5. Una auditoría automatizada no encuentra formateos humanos de fecha que dependan
   implícitamente de la zona del proceso o navegador.
6. Las pruebas automatizadas cubren al menos `TZ=UTC` y una zona distinta de
   `America/Lima`, incluidos casos alrededor de las 00:00 en Perú.
7. Aprueban `npm run typecheck`, `npm run lint`, `npm run build` y las pruebas
   específicas de fecha/hora.

## Plan de verificación

- Pruebas unitarias para formato y límites diarios con timestamps fijos.
- Pruebas de integración de las funciones SQL que usan `now()` o agrupan por día.
- Prueba de UI con la zona del navegador emulada fuera de Perú.
- Inspección de correo y CSV con valores fijos.
- Relectura desde Supabase para comprobar que el instante persistido no fue
  transformado ni truncado.
