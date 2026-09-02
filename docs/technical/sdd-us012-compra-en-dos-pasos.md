# SDD US-012 — Compra en dos pasos

## Objetivo

Separar la compra pública, diseñada primero para celular, en dos pasos dentro de
la misma URL: datos y entradas; luego resumen y pago Yape. La compra y el aforo
solo se persisten al registrar el segundo paso.

## Experiencia acordada

- Paso 1: nombre, celular, correo, selector `− / cantidad / +` (1–20) y nombres
  opcionales por entrada. La acción `Siguiente` avanza sin persistir la compra.
- Paso 2: resumen editable mediante `Editar datos`, total, QR/datos Yape y pagos
  numerados. Cada pago exige código de operación de exactamente 8 dígitos, monto
  positivo e imagen. La suma debe coincidir exactamente con el total.
- QR y datos Yape permanecen lado a lado en móvil y el diseño conserva la
  identidad Bauhaus/ticket existente. La transición es breve y respeta
  `prefers-reduced-motion`.
- No se muestra `Cancelar`: antes del registro no hay una compra persistida y
  `Editar datos` cubre el retorno al primer paso. Tras registrar, se borra el
  borrador y se conserva la pantalla de agradecimiento.
- El borrador usa `localStorage` después de montar el Client Component para no
  producir diferencias de hidratación. Solo guarda texto; nunca imágenes.

## Contrato y seguridad

- El navegador valida antes de habilitar `Registrar compra`, pero la API vuelve
  a validar todos los campos, la correspondencia pago/archivo y los 8 dígitos.
- La función transaccional `crear_registro` comprueba que cada pago tenga ruta,
  código y monto, y que la suma sea `cantidad × precio_unitario` leído de
  `evento`. Así no se puede eludir el total desde DevTools.
- La API consulta duplicados antes de subir archivos y conserva el índice único
  como defensa ante concurrencia. HTTP 409 incluye el código afectado para
  marcar el campo inline sin revelar datos adicionales.
- Los comprobantes continúan en el bucket privado y toda escritura usa
  `service_role` exclusivamente en servidor. RLS no cambia.

## Persistencia y precisión

- Los montos se calculan en céntimos en cliente para evitar errores binarios.
- Un único pago toma automáticamente el total. Al agregar pagos, cada monto es
  editable y se informa cuánto falta o excede.
- Al restaurar un borrador del paso 2 se informa que las imágenes deben volver a
  seleccionarse. La escritura del borrador comienza solo después de hidratarlo
  para que el estado inicial vacío no elimine una restauración pendiente.

## Verificación

- E2E móvil: avanzar, volver y editar; restaurar borrador sin archivo; cancelar;
  registrar y releer compra/pagos desde Supabase.
- API: rechazar formato inválido, total distinto y operación duplicada.
- Esquema: aplicar migración local y comprobar que anon no puede leer tablas.
- Ejecutar `typecheck`, `lint` y `build`.
