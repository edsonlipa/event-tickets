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

## Decisiones abiertas

1. **Destino de la imagen.** El formato es de historia (9:16), no de cuerpo de
   correo. Opciones: reemplazar el QR en el correo, adjuntarla aparte como pieza
   compartible, o ambas.
2. **Composición.** `qrcode` no compone imágenes. Alternativas: agregar `sharp`
   (nativa, ya presente en el ecosistema Next.js), componer en JS puro sobre el
   marco pre-renderizado, o generar SVG y rasterizar.
3. **Peso.** Hoy cada QR pesa ~3 KB. Un arte de 1080 px rondará los cientos de
   KB por entrada; una compra de 5 entradas multiplicaría el correo. Habrá que
   fijar resolución y compresión, o enviar una sola pieza y no una por entrada.
4. **Assets.** Los logos de auspiciadores no existen en `public/`; hay que
   extraerlos del PDF o pedirlos en origen. El arte debe quedar versionado como
   asset del proyecto, no incrustado en código.
5. **Alcance en `/v/[token]`.** Decidir si la entrada pública adopta el mismo
   arte o conserva el QR liso.
6. **Nombre en la entrada.** El arte no reserva un espacio para el nombre de la
   persona, que hoy encabeza cada tarjeta del correo. Definir si se dibuja sobre
   el arte o se mantiene fuera, en el HTML.

## Aceptación

- El QR del arte se lee en los dos celulares del runbook, a distancia normal.
- El correo llega y se ve correctamente en Gmail, Outlook e iCloud.
- El peso del correo con la compra máxima permitida sigue siendo aceptable.
- `typecheck`, `lint` y `build` aprobados.
