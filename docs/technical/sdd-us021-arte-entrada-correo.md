# SDD US-021 — Arte oficial en la entrada enviada por correo

## Alcance

Reemplazar el QR pelado que llega por correo por una entrada con el arte oficial
del evento, conservando intacta la lectura del código en puerta.

## Estado actual

`generarQrEntrada` (`src/lib/qr.ts`) produce un PNG liso de 480 px, nivel de
corrección `M` y margen 2. `armarCorreo` (`src/lib/mail.ts`) adjunta uno por
entrada como inline attachment CID y lo muestra a 240 px dentro de una tarjeta
con borde gris. Cada QR pesa unos 3 KB.

La misma función alimenta `/v/[token]`, así que cualquier cambio de firma afecta
a la entrada pública además del correo.

## Diseño de referencia

`Oficial redes (1).pdf`: 172,5 × 300 pt (proporción 0,575; a 1080 px de ancho son
1878 px de alto). Formato vertical de historia, pensado para redes sociales.

Composición, de arriba abajo:

1. Fondo azul sólido.
2. Título «II OPEN CHAMPIONSHIP» en dos líneas, blanco.
3. Franja con tres logos de auspiciadores.
4. Recuadro blanco de esquinas redondeadas: el espacio del QR.
5. Lema «¡VIVE EL KARATE, ALCANZA LA GLORIA!».

Usa cuatro fuentes incrustadas (CocomatPro-Bold, Seibi-Ohkido-Ultra-Bold,
HighCruiserRegular, Montserrat-Bold) y una imagen incrustada.

## Riesgo principal

El QR debe seguir leyéndose en puerta desde la pantalla de un celular, con luz
variable y prisa. Dos condiciones no negociables:

- **Zona de silencio.** El QR necesita un margen blanco propio. El recuadro
  blanco del arte lo provee, pero hay que verificar que el QR no se dibuje hasta
  el borde del recuadro.
- **Contraste y tamaño.** El QR no puede quedar tan reducido dentro del marco que
  el escáner falle a una distancia normal.

Una entrada bonita que no escanea es peor que un QR feo. La aceptación exige
probar con los dos celulares reales del runbook, no solo mirar la imagen.

## Decisiones

1. **Destino.** El arte reemplaza al QR liso en el correo: una imagen por
   entrada.
2. **Composición.** `sharp` 0.35.4, ya presente como dependencia de Next 16 y
   soportada por Vercel, incrusta el QR sobre un marco PNG pre-renderizado.
3. **Formato.** PNG con paleta a 621×1080. Medido: 19,1 KB por entrada frente a
   28,9 KB en WebP y 75,9 KB en JPEG. Una compra de cinco entradas pesa 0,09 MB.
   El diseño es de colores planos, así que la paleta comprime mejor que cualquier
   formato con pérdida y además conserva los bordes del QR nítidos.
4. **Asset.** El PDF se exporta una vez a `public/entrada-marco.png` y se
   versiona. Sin renderizado de PDF en tiempo de ejecución ni dependencia de
   fuentes instaladas en el servidor. El QR se incrusta en coordenadas fijas; si
   el arte cambia, se reexporta y se recalibran.
5. **Alcance.** `/v/[token]` adopta el mismo arte, para que la entrada se vea
   igual en el correo y en la web. A 390 px de ancho el arte mide 678 px de alto,
   así que en un celular típico entra casi completo y el QR queda en la mitad
   superior: el desplazamiento en puerta es mínimo.
6. **Nombre de la persona.** Permanece como texto en el HTML del correo y como
   título en la web. No se dibuja sobre la imagen, lo que evita incrustar fuentes
   y renderizar texto en el servidor. Contrapartida asumida: si alguien comparte
   la imagen suelta, el nombre no viaja con ella.

## Medidas del marco

Lienzo de 621×1080. El recuadro blanco del QR ocupa aproximadamente 431×412 px a
partir de (94, 444). Con un QR de 450 px y margen 1, queda aire suficiente dentro
del recuadro para la zona de silencio.

## Legibilidad verificada

Se compuso el arte y se decodificó con `jsqr`, el mismo decodificador que usa el
escáner de puerta. Cuatro configuraciones leídas correctamente, devolviendo la
URL esperada:

| Margen del QR | Ancho | Resultado |
|---|---|---|
| 1 | 450 px | leído |
| 2 | 450 px | leído |
| 4 | 450 px | leído |
| 2 | 300 px | leído |

Esto acota el riesgo pero no lo cierra: decodificar un buffer no equivale a
escanear una pantalla con brillo y ángulo reales. La aceptación sigue exigiendo
los dos celulares del runbook.

## Aceptación

- El QR del arte se lee en los dos celulares del runbook, a distancia normal.
- El correo llega y se ve correctamente en Gmail, Outlook e iCloud.
- El peso del correo con la compra máxima permitida sigue siendo aceptable.
- `typecheck`, `lint` y `build` aprobados.
