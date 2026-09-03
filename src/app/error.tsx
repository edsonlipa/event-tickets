"use client";

import { useEffect } from "react";

// Sin este límite, un fallo de JavaScript en cualquier componente de cliente
// desmonta el árbol en silencio: el comprador ve el formulario volver a cero sin
// explicación y vuelve a intentarlo, perdiendo los datos otra vez.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Fallo en la página de compra", error);
  }, [error]);

  return (
    <main className="event-shell grid place-items-center text-center">
      <section className="event-panel w-full max-w-md border-t-8 border-event-red">
        <p className="event-kicker">Algo salió mal</p>
        <h1 className="event-title mt-2">No pudimos cargar la página</h1>
        <p className="mt-4 text-neutral-600">
          Vuelve a intentarlo. Si el problema continúa, escríbenos y te ayudamos a completar tu compra.
        </p>
        <button onClick={reset} className="event-button mt-6 w-full">Reintentar</button>
        {/* Recarga completa, no navegación de cliente: si el bundle o la
            hidratación fallaron, solo un pedido nuevo al servidor lo recupera. */}
        <button onClick={() => window.location.reload()} className="event-button-outline mt-3 w-full">
          Recargar la página
        </button>
        {error.digest && <p className="mt-4 text-xs text-neutral-500">Código del error: {error.digest}</p>}
      </section>
    </main>
  );
}
