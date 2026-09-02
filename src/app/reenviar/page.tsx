import Link from "next/link";

import { FormularioReenvio } from "@/components/FormularioReenvio";
import { PieDePagina } from "@/components/PieDePagina";

export default function ReenviarPage() {
  return <main className="event-shell grid place-items-center"><section className="event-panel w-full max-w-md border-t-8 border-event-yellow"><p className="event-kicker">Entradas</p><h1 className="event-title mt-2">Reenviar mis entradas</h1><p className="mt-3 text-neutral-600">Ingresa el mismo correo que usaste al comprar.</p><FormularioReenvio /><Link href="/" className="mt-6 block text-center text-sm font-bold text-event-blue underline decoration-2 underline-offset-4">Volver a la compra</Link></section><PieDePagina /></main>;
}
