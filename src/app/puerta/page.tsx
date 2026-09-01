import { redirect } from "next/navigation";

import { LoginPuerta } from "@/components/LoginPuerta";
import { obtenerSesionPuerta } from "@/lib/auth-puerta";

export default async function PuertaPage() {
  if (await obtenerSesionPuerta()) redirect("/puerta/escaner");
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><section className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-950"><p className="text-sm font-semibold text-violet-700">CONTROL DE ACCESO</p><h1 className="mt-2 text-3xl font-bold">Puerta</h1><LoginPuerta /></section></main>;
}
