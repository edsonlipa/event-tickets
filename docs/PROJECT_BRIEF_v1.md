# Sistema de Venta y Verificación de Entradas — Project Brief

> Proyecto: NELVOR (agencia de desarrollo, bajo Illapa Systems E.I.R.L.)
> Tipo: proyecto para cliente externo — evento con venta de entradas
> Plazo: evento en ~1 semana desde el inicio del desarrollo
> Última actualización: 31 de agosto de 2026

---

## 1. Contexto

Cliente organiza un evento y necesita vender entradas con pago por **Yape** (único
método), verificar el ingreso el día del evento mediante **QR**, y permitir compras
de **múltiples entradas en una sola transacción** (una persona paga por varias).

El cuello de botella no es solo técnico: Yape no tiene API pública de verificación
de pagos. La solución se diseñó asumiendo eso como restricción de partida, no como
algo a resolver con integraciones complejas dado el plazo de una semana.

---

## 2. Restricciones del proyecto

- **Tiempo:** ~1 semana hasta el evento. No hay margen para procesos de afiliación
  externos (pasarelas de pago) que tomen días de aprobación.
- **Pago:** Yape como único medio. Verificación de pago **manual** por el
  organizador/admin, no automatizada.
- **Sin WhatsApp Business API.** La entrega de entradas es por **correo electrónico**.
- **Conectividad en el local:** se asume buena señal/wifi disponible el día del evento.
- **Sin presupuesto para comisión de pasarela.** Cero costo por transacción es
  prioridad sobre automatización total.

---

## 3. Decisión de arquitectura de pago

Se evaluaron 4 opciones (de manual a pasarela con Yape vía Culqi). Se eligió la
**opción manual con panel de verificación**, por:

- Se construye en días, no depende de aprobación de terceros (a diferencia de
  Culqi/Izipay, que toman 3–7 días hábiles de afiliación).
- Cero comisión.
- El volumen esperado del evento hace manejable la revisión manual por parte
  del organizador.

**Descartado para v1:** integración con pasarela (Culqi CulqiLink / cargos con Yape),
por riesgo de tiempo de afiliación frente al plazo de una semana. Queda como opción
a evaluar si el sistema se reutiliza para futuros eventos del mismo cliente.

---

## 4. Flujo funcional

### 4.1 Compra (página pública, sin login)

Formulario con:
- Nombre del comprador
- Celular
- **Email (obligatorio)** — único canal de entrega de entradas
- Cantidad de entradas a comprar
- Si cantidad > 1: campo opcional por entrada para el nombre de la persona
  a la que corresponde
- Muestra el QR/número Yape del organizador para pagar
- Campo para subir foto del comprobante o ingresar código de operación

Al enviar, queda en estado `pendiente` y se muestra mensaje de confirmación
("tu pago será verificado pronto").

### 4.2 Verificación de pago (admin)

Panel protegido con login (Supabase Auth). Lista de registros con:
- Estado (pendiente / pagado)
- Comprador, celular, email, cantidad de personas
- Comprobante subido
- Buscador por nombre o celular
- Botón **"Confirmar pago"** por registro pendiente

Al confirmar:
1. Se generan N filas en `entradas` (una por persona), cada una con un token
   único (UUID no adivinable).
2. Se arma y envía el correo con las entradas (ver 4.3).
3. El registro pasa a `pagado`. El botón cambia a **"Reenviar correo"**.

El estado de pago y el estado de envío de correo son independientes: si el
correo falla, el pago queda confirmado igual, y el admin puede reintentar el
envío cuando quiera.

### 4.3 Envío de entradas por correo (Resend)

- Un correo por compra, con una tarjeta por entrada (nombre de la persona si
  se especificó) y su QR embebido.
- Los QR se generan en el backend (PNG) y se embeben con **inline images vía
  `content_id` (CID)** — no como `data:` URI directo en el HTML (Gmail/Outlook
  los descartan).
- Requiere dominio verificado en Resend (SPF/DKIM) para evitar spam — **definir
  qué dominio se usa antes de empezar a codear** (ver sección 10).
- Autoservicio: página pública donde el comprador ingresa su email/celular
  para reenviarse las entradas sin depender del admin.

### 4.4 Control de acceso (guardia, día del evento)

Vista protegida con **PIN** (no requiere cuenta), pensada para uso rápido en
la puerta:
- Escáner de QR vía cámara del navegador (funciona en cualquier celular, sin
  instalar app).
- Botón para **encender la linterna** del celular (ambientes con poca luz).
- Al escanear: pantalla completa verde + sonido si es válido; roja + sonido
  distinto si ya fue usado, mostrando cuándo se usó.
- **Búsqueda manual por nombre/celular del comprador** como respaldo si el QR
  no llega, se pierde el celular, o falla la lectura.
- **Reingreso:** no se controla en v1. Un QR usado no vuelve a servir; se deja
  a criterio del guardia si alguien necesita reingresar (no hay estado
  "dentro/fuera").

### 4.5 Reenvío de entradas (autoservicio)

Ver 4.3 — cubierto como parte del flujo de correo, no como feature aparte.

---

## 5. Modelo de datos

```sql
registros
  id                  uuid pk
  nombre_pagador      text
  celular             text
  email               text            -- obligatorio, validar formato
  cantidad_personas   int
  monto_esperado      numeric
  comprobante_url     text            -- foto o referencia del comprobante
  codigo_operacion    text null
  status              text            -- 'pendiente' | 'pagado'
  email_enviado       boolean default false
  email_enviado_at    timestamptz null
  email_error         text null
  created_at          timestamptz default now()

entradas
  id                  uuid pk         -- token del QR, NO correlativo
  registro_id         uuid fk -> registros.id
  nombre_persona      text null       -- opcional
  usado               boolean default false
  usado_at            timestamptz null
  usado_por           text null       -- identificador del dispositivo/guardia
```

---

## 6. Roles y seguridad

| Rol | Acceso | Mecanismo |
|---|---|---|
| Comprador | Solo su propio registro, vía link/QR | Sin login |
| Admin | Confirmar pagos, ver comprobantes, reenviar correo, exportar CSV | Login (Supabase Auth) |
| Guardia | Solo escanear + buscar por comprador. **No** puede confirmar pagos ni editar datos | PIN corto con rate-limiting anti fuerza bruta |

Los tokens de `entradas` deben ser UUID aleatorios, nunca IDs secuenciales
adivinables por URL.

---

## 7. Consideraciones técnicas críticas

- **Concurrencia al escanear:** el "marcar usado" debe ser un `UPDATE ... WHERE
  usado = false RETURNING *` atómico. Si no devuelve fila, ya estaba usado.
  Necesario si hay más de un punto de acceso escaneando contra la misma base
  (evita que un QR reenviado por WhatsApp a varias personas cuele a más de una).
- **Deliverability del correo:** requiere dominio verificado (SPF/DKIM) en
  Resend. Si el correo cae en spam o no llega, la búsqueda manual por
  comprador en la puerta (4.4) ya cubre ese caso — no es un punto único de
  falla para el evento.
- **Validación de monto:** el admin debe ver `cantidad_personas × precio`
  junto al comprobante antes de confirmar, para no aceptar pagos incompletos.
- **Límites de Yape:** verificar tope de S/500 por operación si aplica al
  precio de la entrada, y si la cuenta Yape del organizador es personal
  (límites mensuales) o Yape Negocio.
- **Edición post-confirmación:** el admin debe poder ajustar `cantidad_personas`
  de un registro ya pagado sin invalidar los QR ya generados de las personas
  que no cambian.

---

## 8. Stack sugerido

- Next.js + Supabase (Postgres + Auth + Storage para comprobantes)
- Resend para envío de correo (adjuntos CID para QR)
- `qrcode` (npm) para generación de QR en backend
- Escáner QR en cliente: librería basada en cámara del navegador (ej. `html5-qrcode`)
- Sin necesidad de app nativa en ningún punto del flujo

---

## 9. Fuera de alcance (v1)

- Automatización de verificación de pago (pasarela, notificaciones de Yape)
- Control de reingreso (dentro/fuera)
- Notificaciones vía WhatsApp
- Webhooks de rebote/entrega de Resend (nice-to-have, no bloqueante)
- Multi-evento / reutilización del sistema (evaluar solo si hay una v2)

---

## 10. Pendientes de definir con el cliente antes de codear

- [ ] Dominio a usar para enviar los correos (¿del cliente o subdominio propio?)
      — iniciar verificación DNS en Resend cuanto antes, toma días en propagar.
- [ ] Precio de la entrada (verificar contra topes de Yape).
- [ ] Tipo de cuenta Yape del organizador (personal vs. Yape Negocio).
- [ ] Cantidad estimada de asistentes y número de puertas/guardias en paralelo
      (define qué tan crítico es el punto de concurrencia de la sección 7).
- [ ] Fecha y hora exacta del evento, para fijar el plan de trabajo de la
      sección 11.

---

## 11. Plan de trabajo sugerido (7 días)

| Día | Entregable |
|---|---|
| 1 | Modelo de datos en Supabase + inicio de verificación de dominio en Resend (correr en paralelo, es lo más lento) |
| 2 | Página pública de compra/registro |
| 3 | Panel admin: lista, confirmar pago, buscador, export CSV |
| 4 | Generación de QR + envío de correo (CID) + reenvío autoservicio |
| 5 | Vista guardia: escáner, linterna, búsqueda manual, PIN |
| 6 | Prueba end-to-end en el lugar real: misma luz, misma señal, dispositivos reales |
| 7 | Buffer para ajustes / día del evento |

---

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Correo cae en spam o no llega | Búsqueda manual por comprador en la puerta ya cubre el caso |
| Verificación de dominio en Resend no llega a tiempo | Iniciar día 1, tener plan B de dominio propio ya verificado |
| Mala señal en el local el día del evento | Probar conectividad in situ antes del día 6 |
| QR reenviado a varias personas (mismo grupo) | Update atómico en `entradas` evita doble ingreso |
| Admin confirma pago sin validar monto completo | Mostrar monto esperado junto al comprobante en el panel |
