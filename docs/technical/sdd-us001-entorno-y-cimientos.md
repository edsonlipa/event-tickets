# SDD US-001 — Entorno local y cimientos de datos

## Alcance

Crear una aplicación Next.js reproducible, ejecutar Supabase local mediante la
CLI versionada, definir el modelo de datos v1, un bucket privado de comprobantes
y RLS de denegación total para los roles de navegador.

## Decisiones

- El proyecto es una sola aplicación Next.js; npm gestiona todas las
  dependencias del workspace.
- Supabase CLI inicia los servicios Docker. Sus puertos son 55420–55429 para no
  interferir con otros proyectos locales.
- El correo de desarrollo usa el buzón local incluido por Supabase. Resend se
  usa solo en producción.
- Las tablas no tienen policies RLS. Los Route Handlers y Server Actions futuros
  accederán mediante `service_role`, únicamente desde el servidor.
- `rate_limit_eventos` persiste los intentos de endpoints públicos porque el
  límite en memoria no funciona en serverless.

## Modelo

- `evento`: una única configuración, protegida por un índice de fila única.
- `registros`: compra pendiente, pagada o rechazada; conserva el precio de la
  entrada como snapshot.
- `comprobantes`: N archivos/códigos por registro, con código de operación único.
- `entradas`: UUID no adivinable, anulable y de consumo atómico posterior.
- `intentos_pin` y `rate_limit_eventos`: defensa persistente contra abuso.

## Seed del evento

El modelo requiere nombre, número y titular de Yape reales. Esos insumos siguen
abiertos, por lo que no se insertan placeholders en una migración que podría
llegar a producción. El precio (S/15) y la fecha (6 de septiembre de 2026) se
usarán al crear la fila definitiva con los datos del organizador.

## Verificación

1. `npm run supabase:reset` aplica las migraciones localmente.
2. Una consulta con la anon key a cada tabla recibe denegación por RLS.
3. El bucket `comprobantes` no es público.
4. `npm run typecheck`, `npm run lint` y `npm run build` finalizan correctamente.
