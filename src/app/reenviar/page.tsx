import { FormularioReenvio } from "@/components/FormularioReenvio";

export default function ReenviarPage() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md"><p className="text-sm font-semibold text-violet-700">ENTRADAS</p><h1 className="mt-2 text-3xl font-bold">Reenviar mis entradas</h1><p className="mt-3 text-slate-600">Ingresa el mismo correo que usaste al comprar.</p><FormularioReenvio /></section></main>;
}
