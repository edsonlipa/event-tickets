import { LoginAdmin } from "@/components/LoginAdmin";

export default function AdminLoginPage() {
  return <main className="event-shell grid place-items-center"><section className="event-panel w-full max-w-sm border-t-8 border-event-blue"><p className="event-kicker">Administración</p><h1 className="event-title mt-2">Iniciar sesión</h1><p className="mt-3 text-sm text-neutral-600">Acceso exclusivo para revisar pagos y emitir entradas.</p><LoginAdmin /></section></main>;
}
