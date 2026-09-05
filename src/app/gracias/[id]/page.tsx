import Link from "next/link";

import { PieDePagina } from "@/components/PieDePagina";
import { getDb } from "@/lib/db";
import { sugerirCorreo } from "@/lib/dominio-correo";

export const dynamic = "force-dynamic";

export default async function GraciasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const correoSoporte = process.env.EMAIL_REPLY_TO?.trim() || "arakado@illapasystems.com";

  // El correo se muestra aquí porque es la última oportunidad del comprador de
  // notar un error antes de esperar un mensaje que nunca va a llegar.
  let email: string | null = null;
  try {
    const { data } = await getDb().from("registros").select("email").eq("id", id).maybeSingle();
    email = data?.email ?? null;
  } catch {
    // Si la consulta falla, la página sigue siendo útil con el código.
  }
  const sugerido = email ? sugerirCorreo(email) : null;

  return (
    <main className="event-shell grid place-items-center text-center">
      <section className="event-panel w-full max-w-md border-t-8 border-event-yellow">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-event-yellow text-3xl font-black">✓</div>
        <p className="event-kicker mt-6">Pago registrado</p>
        <h1 className="event-title mt-2">Gracias por tu compra</h1>
        <p className="mt-4 text-neutral-600">
          Te enviamos un correo con el resumen de tu compra. Revisaremos el comprobante y, cuando confirmemos el pago,
          recibirás un segundo correo con tus entradas QR.
        </p>

        {email && (
          <div className="mt-6 border-l-8 border-event-yellow bg-cream p-4 text-left">
            <span className="event-label">Enviaremos tus entradas a</span>
            <p className="[overflow-wrap:anywhere] text-lg font-black">{email}</p>
            {sugerido ? (
              <p role="alert" className="mt-3 border-l-4 border-event-red bg-white px-3 py-2 text-sm">
                <strong className="block font-black">¿Escribiste bien tu correo?</strong>
                Quizá quisiste poner <strong>{sugerido}</strong>. Si es así, escríbenos a{" "}
                <a href={`mailto:${correoSoporte}`} className="font-bold text-event-blue underline decoration-2 underline-offset-4">
                  {correoSoporte}
                </a>{" "}
                con tu código de registro para corregirlo.
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">
                Si no es tu correo, escríbenos a{" "}
                <a href={`mailto:${correoSoporte}`} className="font-bold text-event-blue underline decoration-2 underline-offset-4">
                  {correoSoporte}
                </a>{" "}
                con tu código de registro.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 bg-cream p-4 text-left">
          <span className="event-label">Código de registro</span>
          <p className="break-all font-mono text-xs font-bold">{id}</p>
        </div>
        <Link href="/" className="event-button-dark mt-6 w-full">Volver al inicio</Link>
      </section>
      <PieDePagina />
    </main>
  );
}
