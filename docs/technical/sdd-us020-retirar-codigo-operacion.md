# SDD US-020 — Retirar el código de operación del flujo de compra

## Estado

Diseño aprobado e implementado localmente el 3 de septiembre de 2026.

## Historia

Como comprador, quiero registrar mi comprobante sin ingresar el código de
operación para completar la compra con menos fricción.

## Objetivo

Retirar el código de operación de las compras nuevas sin destruir los códigos ya
registrados ni perder la capacidad de consultarlos para soporte y auditoría.

## Decisiones de producto

1. `comprobantes.codigo_operacion` se conserva nullable y no se borran datos.
2. Las compras nuevas no solicitan, envían ni guardan un código de operación.
3. Los códigos históricos continúan visibles en el detalle administrativo.
4. El buscador administrativo sigue encontrando registros históricos por código.
5. La detección automática de duplicados por código se reemplaza por revisión
   visual manual del comprobante. No se agrega huella de imagen.
6. Cada pago continúa exigiendo una imagen y un monto válido.
7. Se conservan pagos múltiples. El acceso será un enlace discreto con el texto
   `¿Necesitas dividir el pago?`.
8. Con un pago, el monto equivale automáticamente al total. Al dividirlo, los
   montos son editables y su suma debe coincidir exactamente con el total.
9. El correo de rechazo indicará: “Puedes registrar tu compra nuevamente y
   adjuntar un comprobante claro con los datos corregidos.”
10. Durante la transición, la API acepta `codigosOperacion` enviado por una pestaña
    antigua, pero lo ignora y guarda `codigo_operacion = null`.
11. En comprobantes nuevos el detalle muestra solo el monto. La operación se
    renderiza únicamente cuando existe un código histórico.
12. US-011 y su SDD se conservan como antecedente y se marcan reemplazados al
    desplegar US-020; no se elimina documentación histórica.

## Alcance técnico

### Formulario público

En `src/components/FormularioCompra.tsx`:

- retirar `codigo` del estado de cada pago, sus validaciones y mensajes;
- retirar el campo “Código de operación — 8 dígitos”;
- no añadir `codigosOperacion` al `FormData`;
- mantener imagen obligatoria y lógica actual de montos;
- reemplazar la acción visual de pago adicional por el enlace secundario
  `¿Necesitas dividir el pago?`, con menor tamaño y contraste;
- limpiar el borrador persistido para que datos antiguos con `codigo` no vuelvan
  a introducir el campo ni rompan la hidratación.

### API pública y compatibilidad de despliegue

En `POST /api/registros`:

- dejar de exigir correspondencia entre códigos y archivos;
- eliminar formato de ocho dígitos, preconsulta de duplicados, HTTP 409 y
  `codigoOperacion` en la respuesta;
- aceptar silenciosamente `codigosOperacion` legado y no persistir sus valores;
- construir cada comprobante con `codigo_operacion: null`;
- conservar validación de archivos, montos, suma exacta, rate limit, aforo,
  Storage privado y limpieza compensatoria ante errores.

La compatibilidad es unidireccional: una pestaña vieja funciona contra la API
nueva, pero la API nueva nunca reactiva la validación o almacenamiento del código.

### Base de datos

Crear una migración nueva, sin editar migraciones aplicadas, que reemplace
`public.crear_registro`:

- `p_comprobantes` conserva temporalmente el shape JSON para compatibilidad, pero
  ignora `codigo_operacion` y persiste `null`;
- valida un `storage_path` no vacío y un `monto > 0` por comprobante;
- conserva cantidad de comprobantes, suma exacta, bloqueo de `evento`, aforo,
  rate limit y atomicidad actuales;
- elimina la detección y excepción de código duplicado dentro de la función.

Se conserva la columna y puede conservarse el índice parcial histórico: como las
filas nuevas contienen `null`, no participa en nuevas compras. No se ejecuta una
migración destructiva ni se reescriben filas existentes.

### Administración

- Conservar `codigo_operacion` en `admin-data` y en el criterio de búsqueda para
  registros históricos.
- En el detalle, renderizar `Operación: <código> · ` solo cuando el valor exista;
  para compras nuevas mostrar únicamente `Monto: S/ ...`.
- Cambiar el placeholder del buscador a `Nombre, celular, email o código histórico`
  para no sugerir que las compras nuevas generan uno.

### Correo de rechazo

Eliminar toda instrucción de reutilizar un código. El nuevo texto debe orientar a
crear otro registro y adjuntar un comprobante claro. El motivo escapado, el enlace
de regreso, el contacto y la independencia entre rechazo y envío permanecen.

### Documentación operativa

Actualizar en el mismo cambio:

- `PROJECT_BRIEF.md` y `PRD.md`, dejando explícita la decisión posterior del
  cliente y la revisión visual como riesgo aceptado;
- `docs/BACKLOG.md`: US-020 pasa a Hecho y US-011 a Reemplazada;
- `docs/ESTADO_IMPLEMENTACION.md`;
- `docs/RUNBOOK_PRODUCCION.md`: retirar la prueba de operación duplicada;
- auditoría del PRD y cualquier guía que todavía exija el código.

## Seguridad y riesgos

### Riesgo aceptado

Sin código no existe una clave simple para detectar que el mismo pago fue enviado
en compras distintas. La organización acepta revisión visual manual. Una imagen
idéntica, recortada o recapturada podría pasar el registro automático y debe ser
detectada antes de confirmar.

### Controles que no cambian

- comprobante obligatorio por pago;
- monto individual positivo y suma exacta;
- confirmación manual antes de emitir QR;
- Storage privado y URLs firmadas breves;
- RLS cerrada y acceso mediante `service_role` en servidor;
- rate limit persistente, validación de aforo y límites de archivo;
- confirmación idempotente y emisión de entradas atómica.

## Secuencia de despliegue

1. Aplicar la migración compatible en Supabase.
2. Desplegar la aplicación que ya no muestra ni envía códigos.
3. Mantener los datos y el índice histórico.
4. Ejecutar una compra controlada nueva y comprobar que
   `codigo_operacion is null`.
5. Confirmar que una solicitud con `codigosOperacion` legado también finaliza y
   persiste `null`.

La migración debe ser compatible con la versión anterior durante el intervalo de
despliegue. El rollback de aplicación puede volver a mostrar el campo, pero para
reactivar su almacenamiento sería necesario restaurar también la función SQL
anterior mediante una migración hacia delante.

## Criterios de aceptación

El E2E local debe demostrar:

1. Una compra con un solo pago no muestra código, calcula el total y exige imagen.
2. `¿Necesitas dividir el pago?` agrega un segundo pago sin protagonismo visual.
3. En pagos múltiples, cada imagen es obligatoria y la suma debe ser exacta.
4. La API ignora `codigosOperacion` legado y guarda `null`.
5. Un comprobante histórico conserva y muestra su código.
6. El buscador encuentra una compra histórica por código.
7. El detalle nuevo muestra monto sin “Operación: sin código”.
8. El correo de rechazo contiene el nuevo texto y no menciona reutilizar códigos.
9. La anon key continúa sin leer tablas ni ejecutar RPC privadas.
10. Typecheck, lint, build y suites afectadas aprueban.

La historia no exige una compra real en producción para marcarse hecha, por
decisión del producto; la aceptación automatizada local completa es suficiente.

## Estimación

- Implementación y migración: 4–6 horas.
- Actualización de pruebas y documentación: 2–3 horas.
- Total esperado: 6–9 horas, aproximadamente una jornada.
