# PRD — Plan de implementación

> Proyecto: Sistema de venta y verificación de entradas
> NELVOR / Illapa Systems E.I.R.L.
> Documento derivado de `PROJECT_BRIEF.md` v2.3
> Fecha: 31 de agosto de 2026

El brief define **qué** se construye y **por qué**. Este documento define **cómo**:
estructura del repo, contrato de rutas, migraciones, y el desglose de tareas día por
día con criterio de aceptación explícito.

**Evento: domingo 6 de septiembre de 2026.** Hoy es lunes 31 de agosto, así que el
día 1 es hoy y el día 7 es el evento. **No hay día de buffer** — ver §11 del brief.
La hora del evento sigue pendiente; afecta la expiración de la sesión del guardia y
el runbook, no el desarrollo.

---

## 1. Stack y decisiones ya cerradas

| Área | Decisión | Ref. brief |
|---|---|---|
| Framework | Next.js (App Router) en Vercel | §8 |
| Base de datos | Supabase Postgres | §8 |
| Auth admin | Supabase Auth | §6 |
| Auth guardia | PIN → cookie de sesión firmada | §6.3 |
| Archivos | Supabase Storage, bucket **privado** | §6.2 |
| Correo | Resend, QR embebidos por CID | §4.3 |
| QR (generación) | `qrcode` en backend | §8 |
| QR (lectura) | `BarcodeDetector` → fallback `@zxing/browser` | §7.5 |
| App guardia | PWA, **no** nativa | §4.6 |
| Acceso a datos | 100% servidor con `service_role`; RLS `deny all` | §6.1 |
| Cola de correo | Vercel Cron drena `email_enviado = false` | §4.3 |

### Parámetros confirmados

| Parámetro | Valor |
|---|---|
| Precio de la entrada | **S/15** |
| Fecha del evento | **domingo 6 de septiembre de 2026** (hora pendiente) |
| Asistentes estimados | **200–300** (⇒ ~200–250 registros a verificar; S/3.000–4.500) |
| Dominio web | **`entradas.illapasystems.com`** → CNAME a Vercel (único registro a crear) |
| Dominio de envío | **`illapasystems.com`** — **ya verificado en Resend** |
| Remitente | `no-reply@illapasystems.com` + `Reply-To` al cliente |
| Plan de correo | **Resend gratuito**, 100/día, con cola de reintento |

---

## 2. Estructura del repositorio

```
entradas-evento/
├── PROJECT_BRIEF.md          # qué y por qué (v2.3)
├── PRD.md                    # este documento
├── docs/
│   └── PROJECT_BRIEF_v1.md   # archivado
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql
│       ├── 0002_rls.sql
│       ├── 0003_crear_registro.sql
│       ├── 0004_completar_compra_publica.sql
│       ├── 0005_panel_admin.sql
│       ├── 0006_cola_correo.sql
│       ├── 0007_puerta.sql
│       └── 0008_operacion_evento.sql
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # compra
│   │   ├── gracias/[id]/page.tsx
│   │   ├── reenviar/page.tsx
│   │   ├── v/[token]/page.tsx              # landing al escanear con cámara nativa
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx                    # lista de registros
│   │   │   └── registros/[id]/page.tsx     # detalle + confirmar/rechazar
│   │   ├── puerta/
│   │   │   ├── page.tsx                    # PIN
│   │   │   └── escaner/page.tsx
│   │   └── api/                            # ver §3
│   ├── lib/
│   │   ├── db.ts                           # cliente service_role (server-only)
│   │   ├── auth-admin.ts                   # guard de sesión Supabase
│   │   ├── auth-puerta.ts                  # firma/verificación de cookie del PIN
│   │   ├── rate-limit.ts                   # contra Postgres
│   │   ├── qr.ts                           # generación PNG
│   │   ├── mail.ts                         # Resend + armado CID
│   │   ├── storage.ts                      # signed URLs
│   │   └── fecha.ts                        # formato America/Lima
│   └── components/
│       ├── Escaner.tsx
│       ├── SubidaComprobantes.tsx          # compresión canvas
│       └── ...
└── .env.local.example
```

`src/lib/db.ts` lleva `import 'server-only'` en la primera línea. Es la barrera que
impide que la `service_role key` termine en un bundle de cliente por accidente.

---

## 3. Contrato de rutas

### 3.1 Páginas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Formulario de compra |
| `/gracias/[id]` | Público | Confirmación, "tu pago será verificado pronto" |
| `/reenviar` | Público | Autoservicio de reenvío de entradas |
| `/v/[token]` | Público | Landing al escanear el QR con la cámara nativa. **Solo muestra**, no marca usada |
| `/admin/login` | Público | Login Supabase Auth |
| `/admin` | Admin | Lista de registros, filtros, buscador, export |
| `/admin/registros/[id]` | Admin | Detalle, comprobantes, confirmar / rechazar / editar / reenviar |
| `/puerta` | Público | Ingreso de PIN |
| `/puerta/escaner` | Guardia | Escáner + búsqueda manual |

### 3.2 API

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| `POST` | `/api/registros` | Público | Crea registro + comprobantes. Rate-limited. Valida aforo |
| `POST` | `/api/reenviar` | Público | Rate-limited. **Respuesta genérica siempre** |
| `POST` | `/api/admin/registros/[id]/confirmar` | Admin | Idempotente. Genera entradas + envía correo |
| `POST` | `/api/admin/registros/[id]/rechazar` | Admin | Requiere `motivo` |
| `POST` | `/api/admin/registros/[id]/reenviar` | Admin | Reintento manual del correo |
| `PATCH` | `/api/admin/registros/[id]` | Admin | Editar `cantidad_personas` (§4.2) |
| `GET` | `/api/admin/export` | Admin | CSV |
| `POST` | `/api/puerta/session` | Público | Canjea PIN por cookie. Rate-limited |
| `GET` | `/api/puerta/precarga` | Guardia | Lista mínima para offline |
| `GET` | `/api/puerta/buscar?q=` | Guardia | Búsqueda manual. **PII minimizada** |
| `POST` | `/api/puerta/marcar` | Guardia | Update atómico (§7.1). Acepta lote para la cola offline |
| `GET` | `/api/cron/correos-pendientes` | Cron | Drena `email_enviado = false` contra la cuota del día. Protegido por `CRON_SECRET` |

### 3.3 Forma de las respuestas del escáner

`POST /api/puerta/marcar` devuelve siempre uno de cuatro resultados. La UI mapea
cada uno a un color y un sonido:

| `resultado` | Pantalla | Significado |
|---|---|---|
| `admitido` | Verde | Ganó la carrera del update. Pasa |
| `ya_usado` | Roja | Incluye `usado_previamente_at` para mostrar la hora |
| `anulada` | Roja | Entrada invalidada por edición del admin |
| `no_existe` | Roja | Token inválido o de otro evento |

---

## 4. Variables de entorno

```bash
# .env.local.example
NEXT_PUBLIC_SITE_URL=https://entradas.illapasystems.com

# Supabase — la anon key va al navegador SOLO para Auth del admin.
# Con RLS deny-all no puede leer ninguna tabla (§6.1 del brief).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, nunca NEXT_PUBLIC_

# Resend
RESEND_API_KEY=
RESEND_FROM="Entradas <no-reply@illapasystems.com>"
RESEND_REPLY_TO=                    # correo del cliente — también visible en el cuerpo
RESEND_LIMITE_DIARIO=100            # plan gratuito; la cola respeta este tope
CRON_SECRET=                        # protege /api/cron/correos-pendientes

# Guardia
GUARDIA_PIN=                        # 4–6 dígitos
SESSION_SECRET=                     # 32+ bytes aleatorios, firma de la cookie
```

---

## 5. Migraciones

### 5.1 `0001_schema.sql`

El DDL completo está en §5 del brief. Se copia tal cual, sin cambios.

### 5.2 `0002_rls.sql` — la migración crítica

```sql
alter table evento       enable row level security;
alter table registros    enable row level security;
alter table comprobantes enable row level security;
alter table entradas     enable row level security;
alter table intentos_pin enable row level security;

-- Intencionalmente NO se crea ninguna policy.
-- En Postgres, RLS habilitada sin policies = deny all para anon y authenticated.
-- El rol service_role omite RLS por diseño, y es el único que usa la app,
-- siempre desde el servidor. Ver §6.1 del brief.
```

Storage: el bucket `comprobantes` se crea **privado**, sin policies para `anon`.
El admin accede vía signed URLs generadas en el servidor.

### 5.3 Compra pública y seed local

`0003_crear_registro.sql` define la creación transaccional con reserva de aforo.
`0004_completar_compra_publica.sql` conserva los nombres opcionales por entrada,
configura el path del QR real de Yape y consume el rate limit de forma atómica.
`supabase/seed.sql` inserta exclusivamente los datos provisionales locales; nunca
se usa como configuración de producción.

---

## 6. Plan día por día

Cada tarea tiene criterio de aceptación. Una tarea sin criterio verificable no está
hecha.

### Día 1 — Lun 31 ago — Cimientos y el camino crítico

Lo primero del día es el DNS, porque es lo único cuya duración no controlamos.

- [ ] CNAME de `entradas.illapasystems.com` a Vercel — **el único registro DNS que falta**
- [ ] Confirmar en el panel de Resend que el dominio sigue en *Verified* y enviar un correo de prueba
- [ ] `git init` + scaffold Next.js + TypeScript
- [ ] Proyecto Supabase creado; correr `0001_schema.sql` y `0002_rls.sql`
- [ ] Bucket `comprobantes` creado como privado
- [ ] `src/lib/db.ts` con `server-only` y cliente `service_role`
- [ ] Deploy vacío a Vercel con dominio apuntando

**Hecho cuando:** desde el navegador, con la `anon key` en mano, un
`select * from entradas` devuelve **cero filas y ningún dato**. PostgREST puede
representar la denegación RLS como una colección vacía con HTTP 200. Esta prueba
se hace hoy y se repite el día 6 — es el riesgo crítico del §12.

*El DNS de correo ya está verificado (§4.3 del brief), así que este día se acorta
respecto al plan original.*

### Día 2 — Mar 1 sep — Compra pública → abrir venta

- [ ] Formulario `/` con validación (email obligatorio y con formato, cantidad 1–20)
- [ ] Campos dinámicos de nombre por entrada cuando cantidad > 1
- [ ] Panel con QR/número Yape y **monto exacto** calculado en vivo — **requiere el QR y el número del organizador, pedirlos antes del día 2**
- [ ] `SubidaComprobantes`: compresión canvas a ~1600px, límite 5 MB, solo imágenes. **Un archivo alcanza** — a S/15 el máximo por compra es S/300 (§7.4 del brief); la tabla soporta N si aparece el caso
- [ ] `POST /api/registros`: valida aforo (emitidas + pendientes recientes), inserta registro + comprobantes, sube a Storage
- [ ] Rate limit por IP contra tabla Postgres
- [ ] `/gracias/[id]`

- [ ] **Recon de señal en el local** (20 min, un celular, sin app): medir cobertura en la puerta y decidir si la precarga offline del día 5 es imprescindible o un extra

**Hecho cuando:** una compra de 3 entradas desde un celular real queda en
`pendiente` y visible en la base, con la imagen en el bucket privado — **y la venta
está abierta al público**.

### Día 3 — Mié 2 sep — Panel admin

- [x] Login Supabase Auth + proxy que protege `/admin/*`, con autorización repetida en cada página/API
- [x] Lista con filtro por estado y buscador (nombre, celular, email, código de operación)
- [x] **Hoja de contactos:** grilla de 12 comprobantes por pantalla vía signed URL, con el **monto esperado sobreimpreso** en cada miniatura. Selección múltiple + confirmar lote (§4.2 del brief)
- [x] Contador de cuota de correo consumida hoy, visible en la cabecera
- [x] Detalle: comprobantes ampliados, **monto esperado vs. suma de comprobantes** con la diferencia resaltada
- [x] `confirmar` (transacción idempotente condicionada a `status = 'pendiente'`), individual y en lote
- [x] `rechazar` con motivo
- [x] Contador de aforo visible en la cabecera

**Hecho cuando:** doble clic en "Confirmar pago" genera N entradas, no 2N; un
registro rechazado desaparece de la bandeja conservando el motivo; y **12
comprobantes se revisan y confirman en una sola pantalla** sin recargar.

### Día 4 — Jue 3 sep — QR y correo

- [x] `lib/qr.ts`: PNG por entrada, contenido `${SITE_URL}/v/${uuid}`
- [x] `lib/mail.ts`: plantilla con una tarjeta por entrada, QR como **inline attachment CID**, `Reply-To` al cliente y el correo de contacto visible al pie
- [x] Cola de reintento: al fallar un envío se guarda `email_error` y el pago **no** se bloquea
- [x] `GET /api/cron/correos-pendientes` + `vercel.json` con el schedule diario
- [x] Enganche con `confirmar`: pago y correo con estados independientes
- [x] `reenviar` desde el panel, con `email_error` visible si falló
- [x] `/reenviar` autoservicio: rate-limited, **respuesta genérica siempre**
- [x] `/v/[token]`: muestra la entrada, no la marca usada

**Hecho cuando:** el correo llega a **Gmail, Outlook y iCloud** con los QR visibles
en el cuerpo, no como adjuntos sueltos, y ninguno cae en spam. Probar en los tres,
no en uno. Y: forzando un fallo de envío, el registro queda `pagado` con
`email_error` y el cron lo drena en la corrida siguiente.

### Día 5 — Vie 4 sep — Vista guardia + PWA

- [x] `/puerta`: PIN → cookie firmada `httpOnly` con expiración al fin del evento
- [x] Rate limit del PIN contra `intentos_pin`, con bloqueo progresivo por hash de IP
- [x] `Escaner`: `BarcodeDetector` con fallback `@zxing/browser`, `facingMode: environment`
- [x] Linterna condicional a `getCapabilities().torch`
- [x] Wake Lock para que la pantalla no se apague
- [x] Pantalla completa verde/roja + sonidos distintos por resultado
- [x] `POST /api/puerta/marcar` con consumo atómico equivalente al CTE de §7.1
- [x] Precarga offline + cola en `localStorage` + indicador de modo degradado
- [x] Búsqueda manual con PII minimizada
- [x] **PWA:** `manifest.json` (`display: standalone`) + service worker que precachea el shell

**Hecho cuando:** dos celulares escanean el mismo QR simultáneamente y **solo uno**
recibe `admitido`; el otro recibe `ya_usado` con la hora correcta. Y en modo avión,
la vista abre, escanea y encola.

### Día 6 — Sáb 5 sep — Prueba en el lugar real

Este día no es "terminar features", es "descubrir lo que no se ve desde el escritorio".

- [ ] Prueba end-to-end en el local: **misma luz, misma señal, dispositivos reales de los guardias**
- [ ] Medir tiempo real por persona en la puerta
- [ ] Verificar que la PWA instala en los celulares que efectivamente se van a usar; mostrarle el gesto al guardia si es iPhone
- [x] Repetir la prueba de RLS del día 1
- [x] Edición post-confirmación (subir y bajar cantidad, con anulación)
- [x] Export CSV
- [ ] Capacitar al organizador en el panel y a los guardias en el escáner

**Hecho cuando:** el organizador confirma un pago y el guardia escanea esa entrada,
ambos sin ayuda y en sus propios celulares.

### Día 7 — Dom 6 sep — EVENTO

Sin features nuevas ni desarrollo. Solo operación y el runbook de §8.

**Este día no es buffer.** El único margen del cronograma es el sábado 5, que ya
tiene la prueba in situ encima. Si algo se atrasa, se corta alcance (§7), no se come
el sábado.

---

## 7. Qué se corta si el cronograma se atrasa

En este orden, de lo primero a lo último que se sacrifica:

1. **Export CSV** — el organizador puede pedir los datos después del evento.
2. **Edición post-confirmación** — se resuelve manualmente en la base si pasa una vez.
3. **Capa PWA** — el link sin instalar funciona igual.
4. **Autoservicio de reenvío** — el admin reenvía desde el panel.
5. **Precarga offline** — solo si la prueba del día 6 muestra señal sólida en el local.

**No están en esta lista** y no se cortan: la **hoja de contactos** (con ~250
comprobantes es lo que hace operable el panel, no un lujo) y la **cola de reintento**
(sin ella, un fallo de correo se pierde en silencio). Si algo del día 3 se recorta,
que sea el filtro avanzado, no la grilla.

**Nunca se cortan:** RLS, el update atómico, la búsqueda manual en la puerta, y la
validación de monto. Son los cuatro que, si faltan, rompen el evento o filtran datos.

---

## 8. Runbook del día del evento

**La noche anterior**

- [ ] Confirmar que no queden registros en `pendiente`
- [ ] Cargar la vista guardia en cada celular y verificar que precarga
- [ ] Probar linterna en cada dispositivo (o repartir las linternas de clip)
- [ ] Cargar los celulares al 100% y llevar power banks
- [ ] Anotar el PIN en papel, entregarlo a los guardias

**Durante**

- El organizador mantiene `/admin` abierto para confirmar pagos de última hora.
- Si el escáner falla en un celular: recargar la página. Si persiste, ese guardia
  pasa a búsqueda manual mientras se revisa.
- Si se cae la red: la vista sigue operando en modo degradado. **No cerrar la
  pestaña** — la cola vive ahí hasta que sincronice.

**Contactos y accesos que deben estar a mano:** panel de Vercel, panel de Supabase,
panel de Resend, y el celular del organizador.

---

## 9. Bloqueantes abiertos

Este plan asume que se resuelven antes o durante el día 1. Ver §10 del brief.

**Resueltos:** precio (S/15), fecha (dom 6 sep), dominios, plan de correo y volumen.

| Pendiente | Bloquea | Sin esto |
|---|---|---|
| **QR y número Yape del organizador** | Día 2 — **hoy** | La página de compra no se puede terminar, y sin ella no se abre la venta |
| **Hora del evento** | Runbook y sesión del guardia | La cookie se fija con expiración amplia y se ajusta después |
| **Correo del cliente** (`Reply-To`) | Día 4 | Se envía sin `Reply-To` y se agrega después; no bloquea |
| **Nombre, fecha, hora y lugar como texto** | Días 2 y 4 | Copy de la página de compra y del correo |
| Aforo máximo | Día 2 | Se deja `null` (sin tope) y se agrega después |
| Dispositivo de los guardias | Día 5 | Se construye cross-browser igual; solo afecta la linterna |
| Número de puertas | Día 6 | Se prepara para 2 y se ajusta |
