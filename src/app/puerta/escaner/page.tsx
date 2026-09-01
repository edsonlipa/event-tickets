import { redirect } from "next/navigation";

import { Escaner } from "@/components/Escaner";
import { obtenerSesionPuerta } from "@/lib/auth-puerta";

export const dynamic = "force-dynamic";

export default async function EscanerPage() {
  if (!(await obtenerSesionPuerta())) redirect("/puerta");
  return <Escaner siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"} />;
}
