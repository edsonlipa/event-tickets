# Entradas Evento — Contexto y proceso

## Producto

Sistema para un único evento el **domingo 6 de septiembre de 2026**. La entrada
cuesta **S/15** y se paga por Yape; un administrador verifica el pago
manualmente, emite entradas QR por correo y los guardias validan el acceso desde
una PWA.

## Documentos fuente

| Documento | Propósito |
|---|---|
| `PROJECT_BRIEF.md` | Decisiones de producto, alcance, modelo de datos y seguridad. |
| `PRD.md` | Plan de entrega, rutas, tareas y criterios de aceptación. |
| `docs/BACKLOG.md` | Trabajo ejecutable y estado actual. |
| `docs/ESTADO_IMPLEMENTACION.md` | Mapa breve de lo construido, bloqueos y siguiente paso. |
| `docs/desarrollo-local.md` | Requisitos, comandos y URLs locales. |
| `docs/technical/` | SDD (Software Design Document) por cambio no trivial. |

El brief y el PRD son la fuente de verdad funcional. Si se contradicen, se
detiene el cambio y se documenta la decisión antes de implementar.

## Flujo de trabajo

1. Elegir la siguiente historia en `docs/BACKLOG.md` y marcarla `En progreso`.
2. Para un cambio no trivial, crear un SDD en `docs/technical/` antes de tocar
   código. Debe cubrir alcance, decisiones, seguridad, datos y verificación.
3. Implementar solo el alcance aprobado en el SDD y en el PRD.
4. Ejecutar los checks definidos en `AGENTS.md`.
5. En el mismo cambio, actualizar el backlog, el estado de implementación y la
   guía afectada.

Los defectos pequeños y mecánicos pueden omitir el SDD, pero deben conservar
prueba de reproducción y verificación en `docs/ESTADO_IMPLEMENTACION.md`.

## Límites de v1

No incluir pasarela de pago, WhatsApp, control de reingreso, aplicación nativa,
multi-evento ni devoluciones sin una decisión explícita que actualice el brief.
