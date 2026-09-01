# SDD US-003 — Panel de administración

## Alcance

Implementar autenticación con Supabase Auth, bandeja de registros, búsqueda,
hoja de contactos paginada de 12 comprobantes, detalle, confirmación individual
y en lote, rechazo con motivo y contadores operativos.

## Autenticación y autorización

- El login usa email y contraseña de Supabase Auth mediante `@supabase/ssr`.
- La sesión vive en cookies `httpOnly`; el navegador no recibe `service_role`.
- `proxy.ts` refresca la sesión y hace la redirección temprana, pero cada página
  y Route Handler vuelve a llamar `auth.getUser()`. El proxy no es la barrera de
  autorización definitiva.
- Los módulos de datos y autenticación admin comienzan con `import "server-only"`.

## Datos y concurrencia

- La lista se obtiene con `service_role` después de autorizar al admin y se
  pagina a 12 registros. El buscador cubre comprador, celular, email y código de
  operación.
- Solo los comprobantes de la página visible reciben URLs firmadas por 5 minutos.
- La confirmación vive en una función SQL: cambia únicamente filas pendientes y
  genera exactamente `cantidad_personas` entradas en la misma transacción. Dos
  confirmaciones concurrentes producen N entradas, nunca 2N.
- Los nombres guardados por US-002 se asignan a las entradas por posición.
- El rechazo exige motivo y solo afecta registros pendientes.
- US-003 no envía correo. Deja `email_enviado = false` para que US-004 desacople
  confirmación y entrega según el PRD.

## Interfaz

- `/admin` muestra contadores de aforo y correos enviados hoy, filtros, búsqueda
  y una grilla de 12 comprobantes con monto esperado sobreimpreso.
- La selección múltiple confirma el lote sin recargar toda la aplicación; luego
  refresca los datos desde el servidor.
- `/admin/registros/[id]` muestra comprobantes ampliados, suma, diferencia,
  confirmar y rechazar con motivo.

## Seguridad

- El bucket permanece privado. Ninguna URL persistente ni `storage_path` se
  expone como enlace directo.
- Todas las APIs admin responden 401 sin sesión válida.
- Las respuestas no incluyen secretos ni campos fuera del uso administrativo.

## Verificación

1. `/admin` redirige a login sin sesión y acepta un usuario Auth válido.
2. La hoja muestra hasta 12 comprobantes y confirma varios en una operación.
3. Dos requests simultáneos para el mismo registro generan exactamente N entradas.
4. Rechazar exige motivo, conserva auditoría y retira el registro de pendientes.
5. Las signed URLs caducan y el bucket sigue siendo inaccesible para `anon`.
6. `typecheck`, `lint`, `build` y E2E finalizan correctamente.
