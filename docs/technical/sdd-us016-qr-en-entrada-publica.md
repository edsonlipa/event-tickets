# SDD US-016 — QR visible en la entrada pública

## Objetivo

Mostrar el código QR de una entrada válida en `/v/[token]`, usando exactamente la
misma URL canónica que se incluye en el correo.

## Alcance y decisiones

- La página continúa siendo informativa: abrirla no marca ni consume la entrada.
- El QR se genera en el servidor a partir de `urlEntrada(token)` y se entrega como
  una imagen PNG embebida en el HTML.
- No se agregan endpoints públicos ni consultas desde el navegador.
- Las entradas anuladas o usadas siguen mostrando el QR junto con su estado para
  permitir identificación, pero solo la operación atómica de puerta decide el
  acceso.
- Los tokens inexistentes no generan ni muestran un QR.

## Seguridad y datos

La lectura conserva el acceso mediante `service_role` únicamente en el Server
Component. El QR contiene solo la URL pública definida por
`NEXT_PUBLIC_SITE_URL`; no incluye PII ni secretos.

## Verificación

- Abrir una entrada existente y comprobar que muestra un QR legible.
- Confirmar que el QR decodifica a `${NEXT_PUBLIC_SITE_URL}/v/<token>`.
- Comprobar que visitar la página no cambia `usado` ni `usado_at`.
- Ejecutar `npm run typecheck`, `npm run lint` y `npm run build`.
