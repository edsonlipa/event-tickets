export default async function GraciasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="grid min-h-screen place-items-center p-6 text-center"><section><p className="text-sm font-semibold text-violet-700">PAGO REGISTRADO</p><h1 className="mt-2 text-3xl font-bold">Gracias por tu compra</h1><p className="mt-4 text-slate-600">Revisaremos tu comprobante y enviaremos tus entradas al correo indicado.</p><p className="mt-6 text-xs text-slate-400">Código: {id}</p></section></main>;
}
