import { redirect } from "next/navigation";

import { LoginPuerta } from "@/components/LoginPuerta";
import { obtenerSesionPuerta } from "@/lib/auth-puerta";

export default async function PuertaPage() {
  if (await obtenerSesionPuerta()) redirect("/puerta/escaner");
  return <main className="grid min-h-screen place-items-center bg-ink p-6 text-cream"><section className="w-full max-w-sm bg-white p-6 text-ink shadow-[8px_8px_0_var(--event-yellow)]"><p className="event-kicker">Control de acceso</p><h1 className="event-title mt-2">Puerta</h1><p className="mt-3 text-sm text-neutral-600">Ingresa el PIN entregado al equipo de acceso.</p><LoginPuerta /></section></main>;
}
