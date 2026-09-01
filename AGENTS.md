# Reglas de trabajo

Lee `PROJECT.md`, `PROJECT_BRIEF.md`, `PRD.md` y
`docs/ESTADO_IMPLEMENTACION.md` antes de implementar. `docs/PROJECT_BRIEF_v1.md`
es histórico y no es una fuente de decisiones.

## Proceso documentado

- El trabajo activo vive en `docs/BACKLOG.md`.
- Cada funcionalidad no trivial comienza con un SDD en `docs/technical/`.
- Una historia no se marca hecha hasta cumplir su criterio de aceptación del PRD.
- En el mismo cambio de código se actualizan backlog, estado y documentación
  operativa afectada.

## Entorno y comandos

- El gestor de paquetes es npm.
- Supabase se ejecuta con la CLI declarada en las dependencias de desarrollo;
  nunca mediante una instalación global.
- `npm run supabase:start` ejecuta `supabase status || supabase start` y levanta
  Postgres, Auth, Storage, Studio y el servidor de correo local.
- `npm run supabase:stop`, `npm run supabase:reset` y `npm run supabase:status`
  operan exclusivamente la base local. Nunca usar comandos `--linked`, `db push`
  ni `db reset --linked` sin autorización explícita.

## Reglas de seguridad no negociables

- RLS activa y sin policies para `anon` ni `authenticated` en todas las tablas.
- Todos los datos se acceden desde el servidor con `service_role`; los módulos
  correspondientes comienzan con `import 'server-only'`.
- El bucket de comprobantes es privado; solo URLs firmadas y breves para admin.
- No exponer secretos, `service_role`, comprobantes ni PII (información personal)
  en el navegador.
- El consumo del QR es atómico: nunca separar la lectura de `usado` y su update.

## Invariantes del producto

- Los QR contienen `${NEXT_PUBLIC_SITE_URL}/v/<uuid>`; `/v/[token]` solo muestra
  la entrada y nunca la consume.
- El pago y el correo son estados independientes. Un fallo de Nodemailer/Zoho o
  Resend no revierte la confirmación; se registra y queda disponible para reintento.
- Toda entrada pública se valida otra vez en el servidor. Registros, reenvío y PIN
  conservan rate limit persistente; el reenvío siempre responde de forma genérica.
- La búsqueda de puerta no devuelve email ni celular completo. La precarga y cola
  offline son degradadas e idempotentes al sincronizar.
- Ajustar una compra pagada crea nuevas entradas o anula entradas no usadas;
  nunca borra QR emitidos ni anula una entrada ya usada.
- Los tiempos se almacenan como `timestamptz` y se presentan en `America/Lima`.
- Nombre, fecha/hora, lugar, aforo y datos Yape provienen de la fila `evento`; no
  se hardcodean en componentes.

## Secretos y configuración

- Nunca versionar `.env.local` ni credenciales. Mantener `.env.local.example`
  actualizado exclusivamente con valores vacíos o seguros.
- El proveedor de correo se selecciona con `EMAIL_SENDING_PROVIDER`; las claves
  SMTP/Zoho, Resend, `service_role`, PIN y secretos de sesión son solo de servidor.

## Verificación mínima

Tras un cambio relevante ejecutar `npm run typecheck`, `npm run lint` y
`npm run build`. Para cambios de esquema, reiniciar Supabase local, aplicar las
migraciones y comprobar que la anon key no puede leer tablas. Para flujos de UI,
recargar y volver a leer desde la base antes de considerar verificada una acción.
Las aceptaciones de correo requieren Gmail, Outlook e iCloud; las de puerta
requieren dos dispositivos reales y la prueba presencial del runbook.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
