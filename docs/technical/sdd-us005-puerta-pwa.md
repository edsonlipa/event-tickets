# SDD US-005 — Puerta, escáner y PWA

## Alcance

Implementar acceso de guardia mediante PIN, escaneo QR, consumo atómico,
búsqueda manual, operación degradada con precarga y cola local, y capa PWA.

## Sesión y rate limit

- `POST /api/puerta/session` compara `GUARDIA_PIN` en tiempo constante y registra
  cada intento en Postgres usando un hash de IP.
- Cinco fallos dentro de la ventana de 15 minutos bloquean cinco minutos desde el
  último fallo; ocho fallos bloquean treinta minutos.
- Un PIN válido entrega una cookie firmada HMAC-SHA256, `httpOnly`, `sameSite=lax`
  y `secure` en producción. Contiene expiración y un identificador aleatorio del
  dispositivo, nunca el PIN.
- La hora real del evento sigue pendiente. La expiración usa temporalmente el
  final del 6 de septiembre en Lima y se ajustará al cerrar el runbook.

## Consumo y datos

- Una función SQL actualiza únicamente `usado = false and anulada = false` y
  devuelve `admitido`, `ya_usado`, `anulada` o `no_existe` en una transacción.
- La API acepta uno o un lote acotado de tokens para sincronizar la cola offline.
- Precarga devuelve token, nombre de entrada y comprador para las entradas
  activas. Solo está disponible con sesión de guardia.
- Búsqueda devuelve comprador, cantidad, estado y últimos tres dígitos del
  celular. Nunca email, celular completo ni comprobantes.

## Escáner y degradación

- Se usa `BarcodeDetector` donde exista y `@zxing/browser` como fallback.
- Solo se aceptan URLs del origen configurado con prefijo `/v/` y UUID válido.
- Torch aparece únicamente cuando `getCapabilities().torch === true`.
- Wake Lock se solicita mientras la vista está visible y se libera al salir.
- Cada resultado ocupa la pantalla y genera un sonido distinto.
- La precarga se guarda en `localStorage`. Sin red se valida contra ella, se
  marca localmente y se encola el token. Al volver `online`, se sincroniza el lote.
- Riesgo aceptado del brief: dos puertas offline pueden admitir el mismo QR.

## PWA

- `manifest.json` usa `display: standalone`, colores e icono propio.
- `sw.js` cachea el shell visitado y los bundles cargados de puerta; usa
  network-first para navegación y conserva una respuesta cuando no hay conexión.
- La PWA es una mejora; la URL funciona sin instalación.

## Verificación

1. PIN incorrecto se limita y PIN correcto produce cookie sin exponerlo.
2. Dos requests simultáneos del mismo QR devuelven un admitido y un ya usado.
3. Precarga y búsqueda exigen sesión y no filtran email/celular completo.
4. La UI abre, precarga, encola sin red y sincroniza al recuperar conexión.
5. Manifest y service worker permiten volver a abrir el shell sin red.
6. Typecheck, lint, build, E2E y RLS finalizan correctamente.
