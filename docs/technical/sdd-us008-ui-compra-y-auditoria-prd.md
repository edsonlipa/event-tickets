# SDD US-008 — UI de compra y auditoría de conformidad

## Alcance

- Auditar la implementación contra los requisitos y criterios de aceptación del PRD.
- Adoptar en `/` la dirección visual de la pantalla de compra del proyecto Lovable
  de referencia, sin copiar su acceso directo a Supabase ni sus datos hardcodeados.
- Mostrar nombre, fecha, lugar, precio y datos Yape desde la fila `evento`.
- Permitir declarar por comprobante imagen, código de operación y monto, conservando
  la compresión en cliente y la validación completa en el servidor.

No se cambian los flujos de admin, correo o puerta ni se importan dependencias del
proyecto de referencia.

## Decisiones

- La UI usa Tailwind 4 y tokens CSS propios: crema, tinta, rojo, azul y amarillo.
- La composición visual se adapta, no se copia la implementación: `FormularioCompra`
  continúa enviando `multipart/form-data` a `POST /api/registros`.
- Cada comprobante mantiene una posición estable con `comprobantes`,
  `codigosOperacion` y `montosComprobantes` repetidos en el mismo orden.
- Se exige una imagen por comprobante por compatibilidad con el criterio de compra
  vigente; código y monto se guardan como metadatos opcionales. La imagen se
  comprime a JPEG de hasta 1600 px y el servidor vuelve a validar todos los campos.
- El monto declarado es opcional, positivo y sirve al admin para comparar la suma
  con `monto_esperado`; nunca confirma un pago automáticamente.

## Seguridad y datos

- No se introduce cliente Supabase en el navegador ni se expone `service_role`.
- Los archivos siguen llegando al Route Handler y se suben al bucket privado.
- El servidor limita cantidad, longitud, MIME, tamaño y montos; la restricción única
  de `codigo_operacion` permanece como defensa contra duplicados.
- Los datos visuales del evento provienen exclusivamente de `evento`.

## Verificación

- Pruebas E2E de compra: persistencia de nombres, código, monto y compresión.
- `npm run typecheck`, `npm run lint`, `npm run build` y E2E aplicables.
- Revisión visual en ancho móvil y escritorio.
- Documento de auditoría con estado: cumple, parcial, pendiente externo o no cumple.
