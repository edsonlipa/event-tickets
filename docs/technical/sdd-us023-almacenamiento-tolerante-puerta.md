# SDD US-023 — El escáner de puerta tolera el fallo de almacenamiento

## Alcance

Evitar que un fallo de `localStorage` deje al guardia sin respuesta visible al
escanear una entrada.

## Problema

`src/components/Escaner.tsx` escribe en `localStorage` sin protección en tres
puntos. El crítico está en `procesar`:

```ts
localStorage.setItem(CLAVE_COLA, JSON.stringify([...cola, token]));
mostrar({ resultado: "admitido", nombre_persona: nombre });
```

`setItem` lanza excepción cuando la cuota se agota o el navegador bloquea el
almacenamiento —Safari con «Bloquear todas las cookies», modo privado, políticas
de empresa—. Si eso ocurre, `mostrar(...)` no llega a ejecutarse: **el guardia
escanea y no ve ni oye nada**, sin saber si la persona puede pasar.

Los otros dos puntos son `marcarLocalUsado` (línea 17) y el vaciado de la cola en
`sincronizar` (línea 60). Este último sí está dentro de un `try`, pero su `catch`
concluye `setModoOffline(true)`, que informa mal: la red puede estar perfecta y
lo que falló es el almacenamiento.

La ruta afectada es la de **cola offline**, es decir el escenario ya degradado
donde menos conviene que algo más se rompa.

## Diferencia con US-019 del formulario

El mismo defecto en `FormularioCompra` era más grave porque vivía en un
`useEffect`: la excepción escapaba del efecto y React desmontaba el árbol
completo, dejando el formulario inerte. Aquí las escrituras ocurren dentro de
`useCallback`, así que React no desmonta nada; el daño es que la función aborta a
media ejecución y el guardia se queda sin realimentación.

`leerLocal` (línea 15) ya absorbe los fallos de lectura, igual que en el
formulario la lectura estaba protegida y la escritura no.

## Solución propuesta

Un par de ayudantes tolerantes, al estilo de `leerBorrador`/`guardarBorrador`:

```ts
function guardarLocal(key: string, valor: string) {
  try { localStorage.setItem(key, valor); return true; } catch { return false; }
}
```

La realimentación al guardia nunca debe depender de que la escritura funcione:
`mostrar(...)` va primero, o al menos fuera del camino que puede fallar.

Queda por decidir qué hacer cuando la cola offline no se puede persistir. Un
escaneo admitido que no se guarda se pierde al recargar, así que conviene
advertirlo en pantalla en vez de fingir normalidad.

## Aceptación

- Con `localStorage.setItem` forzado a fallar, escanear una entrada válida sigue
  mostrando el resultado y emitiendo el sonido.
- El modo offline no se activa por un fallo de almacenamiento con red presente.
- Prueba en los dos celulares reales del runbook.
