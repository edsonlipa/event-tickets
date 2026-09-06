# SDD US-027 — Enlaces de las entradas disponibles en el detalle

## Alcance

Que el admin obtenga el enlace de cualquier entrada de una compra confirmada sin
salir del detalle y sin depender de WhatsApp ni del correo.

## Problema

US-026 dejó los enlaces en el detalle, pero debajo de las imágenes de los
comprobantes. Medido en el panel real, el bloque empezaba en `y = 937` con un
viewport de 1280×900 y en `y = 1212` en 390×844: fuera de la primera pantalla en
ambos casos. Estaban en la página pero no a la mano, que para el operador es lo
mismo que no estar.

Además el enlace solo se podía seleccionar a mano. Una URL de ~60 caracteres en
una columna estrecha es incómoda de marcar en escritorio e impracticable en el
celular, que es donde el operador atiende durante el evento.

## Decisiones

1. **Antes de los comprobantes.** En una compra confirmada el comprobante ya
   cumplió su función —se revisó para aprobar el pago— y lo que sigue es
   entregar las entradas. El orden de la página refleja ese cambio de tarea.
2. **Un botón copiar por entrada.** Es lo que convierte «mostrado» en
   «disponible»: el caso real es mandarle a una sola persona su entrada.
3. **Copiado tolerante y compartido.** `navigator.clipboard` no existe fuera de
   un contexto seguro, y el panel se prueba por IP en la red local. La lógica de
   copiado con respaldo `execCommand` ya existía en `FormularioCompra` para el
   número de Yape; se extrajo a `src/lib/portapapeles.ts` y ahora la usan los
   dos. Si ninguna vía funciona, se avisa «Copia no permitida» y el enlace sigue
   visible para copiarlo a mano.
4. **Sin cambios de datos.** Misma consulta de US-026: entradas no anuladas, en
   el orden en que las envía el correo.
5. **La URL de la entrada sale de `src/lib/entrada-url.ts`.** Estaba en
   `@/lib/qr`, que carga `sharp` para componer el arte; el detalle solo necesita
   la cadena y no tiene por qué arrastrar un binario nativo a su ruta. `qr.ts`
   la reexporta, así que `mail.ts` no cambia y el formato del enlace sigue
   teniendo una sola definición.

## Aceptación

- En una compra pagada el bloque se ve antes que el primer comprobante, sin
  scroll, en escritorio y en móvil.
- Cada entrada muestra su enlace y un botón que lo copia.
- Una entrada ya usada se distingue.
- Una compra sin entradas emitidas no muestra el bloque.
- `typecheck`, `lint`, `build`, unitarias y E2E de admin y compra aprobados.

## Fuera de alcance

Mostrar la imagen del QR en el detalle y copiar todos los enlaces de una vez.
El envío en bloque ya lo cubren el correo y el botón de WhatsApp de US-026.
