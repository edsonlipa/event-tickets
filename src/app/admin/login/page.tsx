import { LoginAdmin } from "@/components/LoginAdmin";

export default function AdminLoginPage() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-violet-700">ADMINISTRACIÓN</p><h1 className="mt-2 text-3xl font-bold">Iniciar sesión</h1><LoginAdmin /></section></main>;
}
