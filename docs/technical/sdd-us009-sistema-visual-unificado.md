# SDD US-009 — Sistema visual unificado

## Alcance

Aplicar el lenguaje visual tipo ticket/Bauhaus de la compra a todas las vistas:
confirmación, reenvío, landing de entrada, login y panel admin, detalle de registro,
PIN de puerta y escáner. No cambia contratos, datos, permisos ni lógica de negocio.

## Decisiones

- Centralizar tokens y patrones reutilizables en `globals.css`: panel, etiqueta,
  campo, botón, mensajes y fondos geométricos.
- Conservar semántica y textos usados por Playwright para no debilitar las pruebas.
- Admin usa mayor densidad y grilla; no replica el ancho estrecho de compra.
- Puerta conserva negro, verde y rojo de máxima visibilidad. La paleta del evento se
  aplica al shell, búsqueda y controles, nunca reduce el contraste del resultado.
- No se agregan dependencias, fuentes remotas ni assets hardcodeados.

## Seguridad y accesibilidad

- No se modifica acceso a Supabase, autenticación, cookies ni payloads.
- Se mantienen labels, headings, estados de foco, controles nativos y áreas táctiles.
- Los estados no dependen solo del color: conservan texto explícito.
- Los comprobantes permanecen en signed URLs y no se copian a assets públicos.

## Verificación

- Revisión visual móvil de rutas públicas y puerta; escritorio para admin.
- Suite E2E completa para preservar flujos y selectores accesibles.
- `npm run typecheck`, `npm run lint` y `npm run build`.
