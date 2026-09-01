# Sistema de Venta y Verificación de Entradas — Project Brief v2

> Proyecto: NELVOR (agencia de desarrollo, bajo Illapa Systems E.I.R.L.)
> Tipo: proyecto para cliente externo — evento con venta de entradas
> Plazo: evento en ~1 semana desde el inicio del desarrollo
> Versión: 2.3 — 31 de agosto de 2026
> Reemplaza a: `PROJECT_BRIEF_entradas.md` (v1)
> v2.1: se evaluó y descartó la app nativa para el guardia; se adopta PWA (§4.6)
> v2.2: precio, dominios y volumen resueltos (§10.1); hoja de contactos (§4.2) y
>       cola de reintento de correo (§4.3)
> v2.3: precio a S/15, fecha del evento (dom 6 sep) y calendario con fechas reales
> v2.4: proveedor de correo modular; Resend se conserva y se agrega Nodemailer/Zoho

---

## 0. Cambios respecto a v1

Revisión técnica del brief original. Lo que cambió y por qué:

| # | Cambio | Motivo |
|---|---|---|
| 1 | **RLS de Supabase elevada a decisión de arquitectura** (§6.1) | En v1 no se mencionaba. Sin RLS cerrada, el navegador puede leer `entradas` completa → todos los tokens QR expuestos |
| 2 | **Botón de linterna ahora es condicional** (§4.4) | No existe API de linterna en iOS Safari. v1 lo prometía como feature incondicional |
| 3 | **Nuevo estado `rechazado`** en `registros` (§5) | v1 solo tenía `pendiente`/`pagado`; los pagos falsos y registros basura quedaban permanentemente en la bandeja de pendientes |
| 4 | **Nuevo campo `anulada`** en `entradas` (§5) | v1 pedía poder reducir `cantidad_personas` post-confirmación pero no había forma de invalidar un QR ya emitido sin borrar la fila |
| 5 | **Comprobantes pasan a tabla propia** (§5) | Con el tope de Yape, una compra grande se paga en 2+ operaciones. v1 tenía un solo `comprobante_url` y un solo `codigo_operacion` |
| 6 | **Nuevo control de aforo** (§4.1, §5) | v1 no tenía límite de entradas vendidas |
| 7 | **`precio_unitario` como snapshot** en el registro (§5) | Permite cambiar el precio (preventa → puerta) sin corromper los montos históricos |
| 8 | **Índice único en `codigo_operacion`** (§7.6) | Evita que el mismo comprobante se confirme dos veces |
| 9 | **Plan B de Resend redefinido** (§4.3) | `onboarding@resend.dev` no sirve como respaldo: solo envía al email dueño de la cuenta |
| 10 | **Precarga offline en la vista guardia** (§4.4) | v1 mitigaba la mala señal con "probar conectividad", que es un diagnóstico y no una mitigación |
| 11 | **Rate limiting del PIN movido a Postgres** (§6.3) | En serverless la memoria del proceso no persiste entre invocaciones |
| 12 | **Escáner: `@zxing/browser` + `BarcodeDetector`** (§8) | `html5-qrcode` está sin mantenimiento activo |
| 13 | **Capa PWA en la vista guardia; app nativa descartada** (§4.6) | El único beneficio real de React Native sobre el navegador es la linterna en iPhone, y su distribución repite el riesgo de afiliación con un tercero que ya se rechazó en §3 |
| 14 | **Revisión de pagos en hoja de contactos** (§4.2) | Con 200–300 asistentes a S/15 son ~200–250 comprobantes a revisar a mano, en oleada los últimos días. Confirmar de uno en uno no escala |
| 15 | **Cola de reintento de correo con cron** (§4.3) | v1 dejaba `email_enviado`/`email_error` como campos sin proceso que los consumiera. El cron cierra el diseño y absorbe cualquier fallo de envío, incluida la cuota diaria |
| 16 | **Proveedor de correo intercambiable** (§4.3) | Se conserva Resend y se agrega Nodemailer/SMTP para Zoho sin acoplar plantilla, QR ni cola al transporte |

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
- **Conectividad en el local:** se asume buena señal/wifi, pero el sistema **no debe
  depender de ello** en la puerta (ver §4.4).
- **Dispositivo del guardia: no definido.** Se construye cross-browser con detección
  de capacidad; las features exclusivas de Android degradan sin romper.
- **Sin app en tiendas.** Ningún punto del flujo requiere instalación desde App Store
  ni Play Store. La vista guardia se distribuye como **PWA**: una URL que se puede
  añadir a la pantalla de inicio (§4.6).
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
- Muestra el QR/número Yape del organizador y el **monto exacto a pagar**
  (`cantidad × precio_unitario`)
- Subida de **uno o más comprobantes** (foto y/o código de operación)

**Múltiples operaciones de Yape.** Si el monto total supera el tope por operación
de Yape, el comprador paga en varias transferencias. El formulario debe permitir
adjuntar **N comprobantes** a una misma compra, cada uno con su propio código de
operación y monto. El admin valida que la suma cubra el monto esperado.

**Control de aforo.** Antes de aceptar el registro se valida contra
`evento.aforo_maximo`. El conteo incluye entradas ya emitidas **más** las de
registros pendientes con menos de N minutos de antigüedad (reserva blanda), para
no sobrevender mientras el admin verifica. Si `aforo_maximo` es `null`, no hay tope.

**Anti-abuso.** El endpoint es público y escribe en base de datos y Storage:

- Rate limit por IP (registros por hora).
- Límite de tamaño y tipo MIME por archivo (solo imágenes, máx. 5 MB).
- Compresión de la imagen **en el cliente** antes de subir: las fotos de celular
  pesan 3–8 MB y con mala señal la subida falla. Redimensionar a ~1600px de lado
  mayor vía canvas antes del upload.

Al enviar, queda en estado `pendiente` y se muestra mensaje de confirmación
("tu pago será verificado pronto").

### 4.2 Verificación de pago (admin)

Panel protegido con login (Supabase Auth). Lista de registros con:

- Estado (pendiente / pagado / **rechazado**)
- Comprador, celular, email, cantidad de personas
- **Monto esperado** (`cantidad_personas × precio_unitario`) mostrado junto a los
  comprobantes, para no aceptar pagos incompletos
- Comprobantes subidos (vía signed URL de corta duración, ver §6.2)
- Buscador por nombre, celular, email o código de operación
- Botón **"Confirmar pago"** y botón **"Rechazar"** (con motivo) por registro pendiente

Al confirmar:

1. Se generan N filas en `entradas` (una por persona), cada una con un token
   único (UUID aleatorio, no adivinable).
2. Se arma y envía el correo con las entradas (ver §4.3).
3. El registro pasa a `pagado`. El botón cambia a **"Reenviar correo"**.

El estado de pago y el estado de envío de correo son independientes: si el
correo falla, el pago queda confirmado igual, y el admin puede reintentar el
envío cuando quiera.

**Rechazo.** Un registro rechazado sale de la bandeja de pendientes y conserva
`motivo_rechazo` para auditoría. No genera entradas ni correo.

**Revisión en hoja de contactos.** Con 200–300 asistentes a S/15 la mayoría de las
compras son de 1 o 2 entradas: ~200–250 comprobantes a revisar, y no llegan
repartidos sino en oleada los últimos dos días. Confirmar de uno en uno son ~250
cargas de página.

La revisión se hace en grilla: 12 comprobantes por pantalla, cada miniatura con el
**monto esperado sobreimpreso**. El admin marca las que cuadran y confirma el lote.
Eso colapsa ~250 cargas de página en ~20 pantallas.

Lo que **no** cambia: el admin sigue mirando cada comprobante. La verificación es
manual por diseño (§3); se optimiza el clic y la navegación, no el criterio. Todo
registro cuyo monto no cuadre, o al que le falte comprobante, cae fuera del lote y
se resuelve en la vista de detalle.

**Regla operativa:** el organizador confirma **a diario**, no acumula. El comprador
recibe su QR antes y la carga de envío se reparte sola (§4.3).

**Edición post-confirmación.** El admin puede ajustar `cantidad_personas` de un
registro ya pagado:

- **Subir la cantidad:** se insertan filas nuevas en `entradas`. Los QR existentes
  no se tocan.
- **Bajar la cantidad:** se marcan como `anulada = true` las entradas sobrantes
  **no usadas**, empezando por las que no tienen `nombre_persona`. Nunca se borran
  filas — la anulación queda auditable y el QR deja de admitir en la puerta.

### 4.3 Envío de entradas por correo (proveedor intercambiable)

- Un correo por compra, con una tarjeta por entrada (nombre de la persona si
  se especificó) y su QR embebido.
- Los QR se generan en el backend (PNG) y se embeben con **inline images vía
  `content_id` (CID)** — no como `data:` URI directo en el HTML (Gmail/Outlook
  los descartan).
- El QR codifica una **URL** (`https://<dominio>/v/<uuid>`), no el UUID pelado:
  si alguien lo escanea con la cámara nativa del celular llega a una página útil,
  y el escáner del guardia puede validar el prefijo antes de consultar.
- El proveedor se selecciona por configuración: **Resend API** o
  **Nodemailer/SMTP** (Mailpit local y Zoho en producción). Requiere SPF/DKIM
  correctos para el proveedor activo.

**Dominio de envío: `illapasystems.com`.** Resend continúa disponible y fue
verificado por DNS el 31/08/2026:

```
resend._domainkey.illapasystems.com   TXT  p=MIGfMA0GCSqGSIb3DQEB...   DKIM
send.illapasystems.com                MX   feedback-smtp.sa-east-1.amazonses.com
send.illapasystems.com                TXT  v=spf1 include:amazonses.com ~all
```

Toda la infraestructura de envío vive en el subdominio `send.`; el ápex no se toca.
La alineación DMARC se cumple por los dos caminos: SPF se valida contra
`send.illapasystems.com` (mismo dominio organizacional bajo alineación relajada) y
DKIM firma con `d=illapasystems.com`. El DMARC del dominio está en `p=none`: solo
monitoreo, sin riesgo de rechazo. **No tocar esta semana.**

**Consecuencia para el cronograma:** la verificación DNS era lo más lento del camino
crítico y **ya está hecha antes de empezar**. El día 1 solo necesita crear el CNAME
de `entradas.illapasystems.com` hacia Vercel.

`illapa.pe` se descartó: la zona está vacía (sin MX, TXT ni A). Configurarla desde
cero agregaría trabajo y riesgo sin ganar nada.

**Remitente y `Reply-To`.** Se envía desde `no-reply@illapasystems.com` con
**`Reply-To` apuntando al correo del cliente**. El correo con las entradas es, por
definición, al que la gente responde cuando algo sale mal ("no me llegó el QR", "me
equivoqué de nombre"); una dirección sin retorno manda esos mensajes a un agujero
negro justo cuando más importan. Además, el correo de contacto va **visible en el
cuerpo** del mensaje, no solo en la cabecera: mucha gente no usa "Responder", busca
una dirección para escribir o reenviar.

**Cuota y cola de reintento.** Resend gratuito conserva su tope configurado de
100 correos/día. Zoho aplica su propia política SMTP; el límite operativo se
configura sin cambiar la cola. El total necesario es ~250–350 correos en 7 días:
el riesgo principal son las ráfagas si el organizador acumula confirmaciones.

Se cubre completando el diseño que ya está en el modelo de datos:

- Los campos `email_enviado`, `email_enviado_at` y `email_error` existen desde v1
  para desacoplar pago y correo. Faltaba el proceso que los consuma.
- Si un envío falla —por cuota, caída del proveedor o dirección inválida— el
  registro queda `pagado` con `email_enviado = false` y el error guardado. **El pago
  nunca se bloquea.**
- Un **cron diario** (Vercel Cron, gratuito) barre los pendientes de envío y los
  drena contra la cuota del día.
- La hoja de contactos muestra el contador de cuota consumida hoy.

Esto no es un parche contra el límite de Resend: deja el sistema robusto ante
cualquier fallo de correo, que ya era un riesgo listado en §12.

**Autoservicio:** página pública donde el comprador ingresa su email para
reenviarse las entradas sin depender del admin. Con rate limit por email/IP
(el endpoint permite enumerar compradores si no se limita) y respuesta genérica
("si existe una compra con ese correo, te enviamos las entradas") para no
confirmar si un email está o no registrado.

### 4.4 Control de acceso (guardia, día del evento)

Vista protegida con **PIN** (no requiere cuenta), pensada para uso rápido en
la puerta:

- Escáner de QR vía cámara del navegador (funciona en cualquier celular, sin
  instalar app). Requiere **HTTPS** — cubierto por el hosting.
- **Botón de linterna condicional.** El control de `torch` solo existe en
  Chrome/Android vía `MediaStreamTrack.applyConstraints`. **iOS Safari no expone
  API de linterna.** El botón se renderiza únicamente si
  `track.getCapabilities().torch === true`; en iPhone simplemente no aparece.
  → Si el cliente necesita linterna sí o sí, **los guardias deben usar Android**.
- Al escanear: pantalla completa verde + sonido si es válido; roja + sonido
  distinto si ya fue usado (mostrando cuándo), si está anulado, o si el token
  no existe.
- **Búsqueda manual por nombre/celular del comprador** como respaldo si el QR
  no llega, se pierde el celular, o falla la lectura.
- **Reingreso:** no se controla en v1. Un QR usado no vuelve a servir; se deja
  a criterio del guardia si alguien necesita reingresar (no hay estado
  "dentro/fuera").

**Tolerancia a fallos de red.** Al abrir la vista, el cliente precarga la lista
de entradas válidas (id, nombre de persona, nombre del comprador) — con 200–500
entradas son ~20–50 KB. Si la red se cae:

- El escáner sigue validando **localmente** contra la lista precargada.
- Los "usado" se encolan en `localStorage` y se sincronizan al recuperar señal.
- La búsqueda manual sigue funcionando.
- La UI indica claramente el modo degradado.

Riesgo aceptado: durante el corte, un QR duplicado podría colar en dos puertas
distintas. Es estrictamente mejor que la alternativa (la puerta se detiene).

**Instalación como PWA.** La vista se sirve como Progressive Web App: un
`manifest.json` con `"display": "standalone"` y un service worker que precachea el
shell de la aplicación.

- El guardia añade el link a la pantalla de inicio y obtiene un ícono propio. Al
  abrirlo no ve barra de direcciones ni pestañas, así que no toca la URL sin querer
  a mitad de la noche.
- El service worker hace que la vista abra **sin conexión**, no solo mientras la
  pestaña siga viva.
- **En Android**, Chrome ofrece el banner de instalación automáticamente. **En
  iPhone** el gesto es manual y está escondido (Safari → Compartir → Añadir a
  pantalla de inicio): hay que mostrárselo al guardia en la prueba del día 6.
- El link sin instalar funciona igual. La PWA es una mejora, no un requisito.
- Una PWA corre sobre el motor de Safari en iOS, así que **no cambia nada respecto
  a la linterna**.

`getUserMedia` en PWA standalone de iOS funciona desde iOS 14.3; el bug histórico
que lo impedía ya no es un riesgo.

### 4.5 Reenvío de entradas (autoservicio)

Ver §4.3 — cubierto como parte del flujo de correo, no como feature aparte.

### 4.6 Decisión: navegador (PWA) vs. app nativa para el guardia

Se evaluó construir la vista guardia como **app nativa con React Native / Expo**.
**Descartado.** El razonamiento queda documentado porque es la segunda decisión de
arquitectura del proyecto, y conviene poder releerla si el sistema se reutiliza.

**Lo único que la app nativa aporta sobre el navegador es la linterna en iPhone.**
iOS nativo expone `AVCaptureDevice.torchMode`; Safari no lo expone al JavaScript.
Todo lo demás — escaneo, pantalla completa, sonido, mantener la pantalla encendida,
cola offline — ya está cubierto por APIs web.

Ese beneficio se anula solo:

- Si los guardias usan **Android**, el navegador ya da la linterna → la app nativa
  no aporta nada.
- Si los guardias usan **iPhone**, la app sí aporta la linterna, pero es exactamente
  el caso donde distribuirla cuesta más.

**El costo no está en el código, está en la distribución.** El escáner en Expo es
incluso más simple que en web (`expo-camera` trae lectura de códigos y `enableTorch`
como prop): ~1.5 días. Lo caro es meter la app en el celular del guardia:

| Vía | Costo real |
|---|---|
| APK Android por sideload | Trivial — pero si son Android, la app no hace falta |
| App Store | Revisión y riesgo de rechazo. Inviable a 7 días |
| TestFlight externo | También pasa por revisión de Apple (24–48 h) |
| TestFlight interno / Ad-hoc | Sin revisión, pero exige **Apple Developer Program**: 24–48 h para persona natural y más para empresa (piden D-U-N-S para Illapa Systems E.I.R.L.), más registrar el UDID de cada iPhone a mano |

Es **el mismo riesgo que ya se descartó en §3**: un trámite de afiliación con un
tercero, de duración que no controlamos, contra un plazo de una semana. Sería
incoherente rechazar la pasarela por eso y aceptarlo por una linterna.

**La linterna se resuelve como problema de iluminación, no de software:** una
linterna de clip o un frontal para el guardia (S/20–30) funciona en cualquier
celular y no depende de Apple.

**Dos ventajas del navegador que la app nativa no recupera**, y que en un evento
pesan más de lo que parece:

1. **Actualización en caliente.** Un bug detectado a las 8 p.m. del evento se
   despliega y todos los guardias lo tienen al recargar. Con una app instalada, no.
2. **Absorbe lo imprevisto.** Un guardia extra con un celular que nadie planificó
   entra con solo abrir el link.

**Se adopta en cambio la capa PWA** descrita en §4.4 (~3 h, día 5): cubre la mayor
parte de la brecha con cero costo de distribución.

**Reevaluar solo si** el cliente exige iPhone en la puerta **y** la linterna resulta
imprescindible tras la prueba in situ del día 6. Incluso entonces, la salida
realista es exigir Android a los guardias, no construir la app.

---

## 5. Modelo de datos

```sql
-- Configuración del evento. Una sola fila en v1.
create table evento (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  fecha             timestamptz not null,
  precio_unitario   numeric(10,2) not null,
  aforo_maximo      int,                       -- null = sin tope
  yape_numero       text not null,
  yape_titular      text not null,
  yape_qr_url       text,                      -- asset local; null hasta recibir el QR real
  lugar             text                       -- null hasta confirmar el local
);

create table registros (
  id                uuid primary key default gen_random_uuid(),
  nombre_pagador    text not null,
  celular           text not null,
  email             text not null,             -- obligatorio, validar formato
  cantidad_personas int  not null check (cantidad_personas between 1 and 20),
  nombres_personas  jsonb not null default '[]', -- posición por entrada; null si no se indicó
  precio_unitario   numeric(10,2) not null,    -- snapshot al momento de la compra
  monto_esperado    numeric(10,2)
                    generated always as (cantidad_personas * precio_unitario) stored,
  status            text not null default 'pendiente'
                    check (status in ('pendiente','pagado','rechazado')),
  motivo_rechazo    text,
  email_enviado     boolean not null default false,
  email_enviado_at  timestamptz,
  email_error       text,
  email_intento_at  timestamptz,              -- claim breve anti envío duplicado
  confirmado_at     timestamptz,
  confirmado_por    uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

-- Auditoría y conteo real de cuota; incluye reenvíos.
create table email_envios (
  id                bigserial primary key,
  registro_id       uuid not null references registros(id) on delete cascade,
  exito             boolean not null,
  error             text,
  created_at        timestamptz not null default now()
);

create index on registros (status, created_at desc);
create index on registros (lower(email));
create index on registros (celular);

-- N comprobantes por compra: el tope de Yape obliga a pagos fraccionados.
create table comprobantes (
  id                uuid primary key default gen_random_uuid(),
  registro_id       uuid not null references registros(id) on delete cascade,
  storage_path      text not null,             -- bucket PRIVADO
  codigo_operacion  text,
  monto             numeric(10,2),
  created_at        timestamptz not null default now()
);

-- Defensa barata contra confirmar dos veces el mismo comprobante.
create unique index comprobantes_codigo_operacion_uniq
  on comprobantes (codigo_operacion)
  where codigo_operacion is not null;

create index on comprobantes (registro_id);

create table entradas (
  id                uuid primary key default gen_random_uuid(),  -- token del QR
  registro_id       uuid not null references registros(id) on delete cascade,
  nombre_persona    text,                      -- opcional
  anulada           boolean not null default false,
  usado             boolean not null default false,
  usado_at          timestamptz,
  usado_por         text,                      -- identificador del dispositivo/guardia
  created_at        timestamptz not null default now()
);

create index on entradas (registro_id);
create index on entradas (usado) where anulada = false;

-- Rate limiting del PIN de guardia. En serverless la memoria del proceso
-- no persiste entre invocaciones: tiene que vivir en la base.
create table intentos_pin (
  id          bigserial primary key,
  ip_hash     text not null,                   -- hash, no la IP en claro
  exito       boolean not null,
  created_at  timestamptz not null default now()
);

create index on intentos_pin (ip_hash, created_at desc);
```

**Los tokens de `entradas` son UUID aleatorios** (`gen_random_uuid()`), nunca IDs
secuenciales adivinables por URL.

---

## 6. Roles y seguridad

| Rol | Acceso | Mecanismo |
|---|---|---|
| Comprador | Solo su propio registro, vía link/QR | Sin login |
| Admin | Confirmar/rechazar pagos, ver comprobantes, reenviar correo, editar cantidad, exportar CSV | Login (Supabase Auth) |
| Guardia | Solo escanear + buscar por comprador. **No** puede confirmar pagos ni editar datos | PIN corto → cookie de sesión firmada |

### 6.1 Regla de arquitectura: las tablas nunca se exponen al cliente

Es la decisión de seguridad más importante del proyecto y se toma el día 1.

Si el navegador habla con Supabase usando la `anon key`, cualquiera puede hacer
`select * from entradas` y obtener **todos los tokens QR** → entradas gratis para
todo el mundo. `registros` además es PII pura (nombre, celular, email, comprobantes
de pago con datos bancarios visibles).

Por lo tanto:

- **RLS activada en todas las tablas, con `deny all` por defecto.** Ninguna policy
  permisiva para el rol `anon`.
- **Todo el acceso a datos pasa por Route Handlers / Server Actions** en el servidor,
  usando `service_role`. La `service_role key` vive solo en variables de entorno del
  servidor y **jamás** se referencia desde código de cliente.
- Cada endpoint valida rol y devuelve **solo los campos que ese rol necesita**.

### 6.2 Comprobantes: bucket privado

El Storage de comprobantes es un bucket **privado**. Son capturas de Yape con
nombres y números de teléfono. El admin los ve mediante **signed URLs de corta
duración** (minutos) generadas en el servidor. Nunca un bucket público.

### 6.3 PIN de guardia

- El PIN se canjea una sola vez por una **cookie de sesión firmada** (`httpOnly`,
  `secure`, `sameSite=lax`), con expiración fijada al fin del evento. El PIN no
  viaja en cada request.
- **Rate limiting persistido en Postgres** (tabla `intentos_pin`, ver §5): bloqueo
  progresivo por hash de IP tras N intentos fallidos. Un `Map` en memoria no sirve
  en serverless.
- **Minimización de PII.** La búsqueda manual del guardia devuelve únicamente
  nombre del comprador, cantidad de entradas y su estado. **Nunca** email ni
  celular completo (a lo sumo los últimos 3 dígitos del celular para desambiguar).
  El guardia solo necesita decidir si deja pasar a alguien, no la base de datos
  de clientes.

---

## 7. Consideraciones técnicas críticas

### 7.1 Concurrencia al escanear

El "marcar usado" debe ser atómico. Necesario si hay más de un punto de acceso
escaneando contra la misma base (evita que un QR reenviado por WhatsApp a varias
personas cuele a más de una).

Con 200–300 asistentes y 1–2 puertas, la probabilidad de colisión real es baja. El
update atómico se mantiene igual: ya está escrito, no cuesta nada, y protege el caso
que sí importa (el mismo QR reenviado dentro de un grupo, llegando por dos puertas
o dos veces por la misma).

La consulta debe además distinguir los tres casos de fallo (no existe / ya usado /
anulada) para mostrar el mensaje correcto en la puerta. Una sola ida a la base:

```sql
with intento as (
  update entradas
     set usado = true, usado_at = now(), usado_por = $2
   where id = $1 and usado = false and anulada = false
  returning id
)
select e.id,
       e.nombre_persona,
       e.anulada,
       e.usado      as ya_estaba_usado,   -- valor previo al update
       e.usado_at   as usado_previamente_at,
       (select count(*) from intento) = 1 as admitido
  from entradas e
 where e.id = $1;
```

Los cambios de un CTE que modifica datos no son visibles para el resto de la
consulta, así que `usado_at` devuelve el instante del **uso anterior** — justo lo
que hay que mostrar en la pantalla roja. Cero filas ⇒ el token no existe.

### 7.2 Deliverability del correo

Requiere dominio verificado (SPF/DKIM) en Resend. Si el correo cae en spam o no
llega, la búsqueda manual por comprador en la puerta (§4.4) ya cubre ese caso —
no es un punto único de falla para el evento.

### 7.3 Validación de monto

El admin ve `cantidad_personas × precio_unitario` junto a los comprobantes antes
de confirmar. Con pagos fraccionados, la suma de `comprobantes.monto` debe cubrir
el `monto_esperado`; el panel resalta la diferencia si no cuadra.

### 7.4 Límites de Yape

**Del lado del comprador: resuelto.** Con la entrada a S/15 y el `CHECK` del schema
limitando a 20 entradas, el máximo posible por compra es **S/300** — holgadamente bajo
cualquier tope por operación, incluso el más conservador de S/500.

Consecuencia práctica: la tabla `comprobantes` (§5) casi nunca se va a ejercitar. Se
mantiene porque es el modelo correcto y no cuesta nada, pero **el uploader puede
shippear aceptando un solo archivo**; la tabla soporta N si el caso aparece.

**Del lado del organizador: fuera de alcance por decisión del cliente (31/08).** A
S/15 y 200–300 asistentes la recaudación ronda S/3.000–4.500 en pocos días. Si el
organizador llegara a topar el límite de recepción de su cuenta, la salida es
operativa y no de software: pasar a Yape Negocio. No se construye nada al respecto.

### 7.5 Escáner cross-browser

- `BarcodeDetector` nativo donde exista (Chrome/Android: rápido y sin bundle).
- Fallback a `@zxing/browser` en el resto (incluido iOS Safari).
- `getUserMedia` con `facingMode: 'environment'`; el permiso de cámara se pide
  una sola vez al abrir la vista, no por escaneo.
- Linterna solo si `getCapabilities().torch` lo reporta (ver §4.4).

### 7.6 Idempotencia y duplicados

- Índice único parcial en `comprobantes.codigo_operacion` (§5): el mismo código de
  Yape no se puede registrar dos veces.
- La confirmación de pago debe ser idempotente: si el admin hace doble clic, no se
  generan 2N entradas. Generar dentro de una transacción condicionada a
  `status = 'pendiente'`.

### 7.7 Zona horaria

Todo se almacena en `timestamptz` (UTC). La UI renderiza en `America/Lima`.
Fijarlo en un único helper de formato, no ad-hoc por componente.

---

## 8. Stack

- **Next.js** (App Router) + **Supabase** (Postgres + Auth + Storage privado)
- **Proveedor modular de correo:** Nodemailer/SMTP (Mailpit o Zoho) y Resend,
  seleccionable por configuración; inline attachments CID para los QR
- `qrcode` (npm) para generación de QR en backend
- Escáner: **`BarcodeDetector` nativo con fallback a `@zxing/browser`**
  (se descarta `html5-qrcode`, sin mantenimiento activo)
- Compresión de imagen en cliente vía `canvas` antes del upload
- **PWA** en la vista guardia: `manifest.json` (`display: standalone`) + service
  worker que precachea el shell
- **Vercel Cron** (gratuito) para drenar la cola de correos pendientes (§4.3)
- Sin app nativa ni distribución por tiendas en ningún punto del flujo (§4.6)

---

## 9. Fuera de alcance (v1)

- Automatización de verificación de pago (pasarela, notificaciones de Yape)
- Control de reingreso (dentro/fuera)
- Notificaciones vía WhatsApp
- Webhooks de rebote/entrega de Resend (nice-to-have, no bloqueante)
- Multi-evento / reutilización del sistema (evaluar solo si hay una v2)
- Devoluciones / cancelación de compra por parte del comprador
- App nativa para el guardia (React Native / Expo) — evaluada y descartada, ver §4.6

---

## 10. Definiciones

### 10.1 Resueltos

| Definición | Valor | Impacto |
|---|---|---|
| **Precio de la entrada** | **S/15** | `evento.precio_unitario = 15.00`. Máximo por compra S/300 (§7.4) |
| **Fecha del evento** | **domingo 6 de septiembre de 2026** | Hora aún sin definir. Fija el calendario de §11 |
| **Dominio de envío** | **`illapasystems.com`**, ya verificado en Resend | El DNS de correo, lo más lento del camino crítico, ya está hecho (§4.3) |
| **Dominio web** | **`entradas.illapasystems.com`** | CNAME a Vercel. Alineado con el remitente. `illapa.pe` descartado: zona vacía |
| **Remitente** | `no-reply@illapasystems.com` + `Reply-To` al cliente | Contacto también visible en el cuerpo (§4.3) |
| **Proveedor de correo** | **Resend o Nodemailer/Zoho**, seleccionable | Resend se conserva como alternativa; ambos usan la misma cola y QR CID (§4.3) |
| **Asistentes estimados** | **200–300** | ~200–250 comprobantes a revisar: motiva la hoja de contactos (§4.2). Recaudación estimada S/3.000–4.500 |

### 10.2 Pendientes

**Bloqueantes:** ninguno relacionado con los datos públicos del evento.

*Los topes de Yape del organizador quedaron fuera de alcance por decisión del cliente
(31/08). Ver §7.4.*

**Contenido y accesos a pedir al cliente (bloquean días concretos):**

- [ ] **Correo del cliente** para el `Reply-To` y para mostrar en el cuerpo (día 4).
- [x] **Datos del evento y Yape** — nombre, fecha, hora, lugar, QR, número y
      titular confirmados el 1 de septiembre de 2026.
- [x] **Logo o imagen del evento** — banner oficial recibido y configurado.

**Importantes (tienen valor por defecto seguro):**

- [x] **Aforo máximo del local** — confirmado sin tope; `evento.aforo_maximo = null`.
- [ ] **Dispositivo de los guardias.** Si el cliente necesita el botón de linterna,
      **tienen que ser Android**: en iPhone no es implementable ni en web ni en PWA,
      y la app nativa quedó descartada (§4.6). Alternativa sin código: linterna de
      clip o frontal para el guardia.
- [ ] **Número de puertas en paralelo.** Con 200–300 personas, 1 puerta alcanza y 2
      es cómodo. Define cuántos celulares preparar el día 6.
- [ ] **¿Hay precios distintos** (preventa / puerta / cortesía)? v1 asume precio único.

---

## 11. Plan de trabajo

**Evento: domingo 6 de septiembre de 2026.** Hoy es lunes 31 de agosto: quedan
**6 días de trabajo** más el día del evento.

| Día | Fecha | Entregable |
|---|---|---|
| 1 | **Lun 31 ago** | CNAME de `entradas.illapasystems.com` a Vercel + schema en Supabase con RLS `deny all` + scaffold Next.js + deploy vacío a producción. **El DNS de correo ya está hecho (§4.3), así que este día se acorta** |
| 2 | **Mar 1 sep** | Página pública de compra: formulario, aforo, comprobante con compresión en cliente, rate limit. **→ ABRIR VENTA.** Además: *recon de señal en el local* (20 min, un celular, sin app) |
| 3 | **Mié 2 sep** | Panel admin + hoja de contactos: lista, confirmar, rechazar, buscador, validación de monto, signed URLs. **→ empezar a confirmar pagos** |
| 4 | **Jue 3 sep** | Generación de QR + correo con CID + `Reply-To` + cola de reintento con cron + reenvío autoservicio. **Probar entrega real en Gmail, Outlook y iCloud, no solo en un cliente** |
| 5 | **Vie 4 sep** | Vista guardia: PIN + sesión, escáner cross-browser, linterna condicional, búsqueda manual, precarga offline, **capa PWA** |
| 6 | **Sáb 5 sep** | **Prueba end-to-end en el lugar real**: misma luz, misma señal, dispositivos reales. Capacitación. Edición post-confirmación + export CSV |
| 7 | **Dom 6 sep** | **EVENTO** |

### No hay día de buffer

El plan original listaba el día 7 como "buffer / día del evento". Con las fechas
reales eso ya no se puede sostener: **el día 7 es el evento**. El único margen real
es el sábado 5, que además es el día de la prueba in situ — no puede ser las dos
cosas si algo se atrasa.

Regla práctica: si el **jueves 3 por la noche** la vista guardia no arrancó, aplicar
de inmediato la lista de corte (§7 del PRD) en vez de comerse el sábado.

### El recon de señal se adelanta al día 2

El riesgo de mala señal en el local (§12) se mitigaba "probando conectividad antes
del día 6", pero nunca estaba agendado. Medir la señal en la puerta **no necesita la
app**: es un celular y 20 minutos. Hacerlo el día 2 permite saber **antes de
construirla** si la precarga offline es imprescindible o un extra — y evita
descubrirlo el sábado, cuando ya no hay tiempo de reaccionar.

### Sobre la ventana de venta

La página de compra sale el **martes 1**, así que quedan ~5 días para vender. El
sistema no limita nada, pero 200–300 entradas en 5 días supone que la promoción del
cliente ya esté corriendo. Si aún no arrancó, conviene avisarle hoy: es su camino
crítico, no el nuestro.

El export CSV y la edición post-confirmación quedan en el día 6 a propósito: son lo
primero que se sacrifica si algo se atrasa.

---

## 12. Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| **Tablas expuestas al cliente → todos los tokens QR filtrados** | **Crítica** | RLS `deny all` + todo el acceso vía servidor con `service_role` (§6.1). Se verifica el día 1, no al final |
| ~~Verificación de dominio en Resend no llega a tiempo~~ | **Cerrado** | `illapasystems.com` ya verificado y comprobado por DNS (§4.3) |
| **No hay día de buffer: el día 7 es el evento** | **Alta** | El sábado 5 es el único margen, y es también el día de la prueba in situ. Aplicar la lista de corte del PRD §7 apenas algo se atrase, no el sábado (§11) |
| La promoción del cliente no alcanza a llenar el aforo en 5 días de venta | Media | Fuera de nuestro control; avisar al cliente el día 1. El sistema opera igual con cualquier volumen |
| El organizador topa el límite de recepción de su Yape | Baja | Evaluado y descartado por el cliente (31/08). A S/15 la recaudación ronda S/3.000–4.500. Si aparece, la salida es operativa: Yape Negocio (§7.4) |
| Correo cae en spam o no llega | Media | Búsqueda manual por comprador en la puerta ya cubre el caso; autoservicio de reenvío |
| Mala señal en el local el día del evento | Media | Precarga offline + cola de sincronización en la vista guardia (§4.4). Probar in situ antes del día 6 |
| QR reenviado a varias personas (mismo grupo) | Media | Update atómico en `entradas` (§7.1) |
| El cliente asume linterna en iPhone | Media | Confirmar dispositivo con el cliente **antes** del día 5; el botón degrada solo |
| Compra grande supera el tope de Yape y el comprador se traba | Media | Múltiples comprobantes por registro (§4.1) + mostrar el monto exacto y advertir del tope en el formulario |
| Admin confirma pago sin validar monto completo | Media | Monto esperado y suma de comprobantes junto a las fotos (§7.3) |
| Mismo comprobante usado en dos registros | Baja | Índice único en `codigo_operacion` (§7.6) |
| Sobreventa por encima del aforo | Baja | Validación de aforo con reserva blanda de pendientes (§4.1) |
| Spam en el formulario público llena BD y Storage | Baja | Rate limit por IP + límite de tamaño/MIME |
| El organizador no da abasto revisando ~250 comprobantes | Media | Hoja de contactos con confirmación en lote (§4.2) + regla de confirmar a diario |
| La cuota diaria de Resend corta envíos en la oleada final | Media | Cola de reintento con cron: el pago no se bloquea y el correo se drena al día siguiente (§4.3). La búsqueda manual en la puerta cubre el resto |
| El guardia con iPhone no encuentra cómo instalar la PWA | Baja | El link sin instalar funciona igual; mostrar el gesto en la prueba del día 6 |
