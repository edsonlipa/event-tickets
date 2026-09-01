"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const MAX_LADO_IMAGEN = 1600;
const CALIDAD_JPEG = 0.82;

type Evento = {
  nombre: string;
  precioUnitario: number;
  yapeNumero: string;
  yapeTitular: string;
  yapeQrUrl: string | null;
};

function cargarImagen(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No pudimos leer ${file.name}.`));
    };
    image.src = url;
  });
}

async function comprimirComprobante(file: File) {
  const image = await cargarImagen(file);
  const escala = Math.min(1, MAX_LADO_IMAGEN / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * escala));
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Tu navegador no pudo preparar el comprobante.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG),
  );

  if (!blob) throw new Error(`No pudimos comprimir ${file.name}.`);

  const nombreBase = file.name.replace(/\.[^.]+$/, "") || "comprobante";
  return new File([blob], `${nombreBase}.jpg`, { type: "image/jpeg" });
}

export function FormularioCompra({ evento }: { evento: Evento }) {
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  const total = cantidad * evento.precioUnitario;

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError("");

    try {
      const form = event.currentTarget;
      const original = new FormData(form);
      const archivos = original
        .getAll("comprobantes")
        .filter((value): value is File => value instanceof File && value.size > 0);
      const comprimidos = await Promise.all(archivos.map(comprimirComprobante));
      const body = new FormData(form);
      body.delete("comprobantes");
      comprimidos.forEach((archivo) => body.append("comprobantes", archivo));

      const response = await fetch("/api/registros", { method: "POST", body });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "No pudimos registrar tu compra.");
      }

      router.push(`/gracias/${result.id}`);
    } catch (caught) {
      setEnviando(false);
      setError(caught instanceof Error ? caught.message : "No pudimos registrar tu compra.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <p className="text-sm font-semibold text-violet-700">ENTRADAS</p>
      <h1 className="mt-2 text-3xl font-bold">{evento.nombre}</h1>

      <section className="mt-6 grid gap-5 rounded-2xl bg-violet-50 p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold">Pago por Yape</p>
          <p className="text-2xl font-bold">{evento.yapeNumero}</p>
          <p className="text-sm">Titular: {evento.yapeTitular}</p>
          <p className="mt-3 font-semibold">Total exacto: S/ {total.toFixed(2)}</p>
        </div>
        {evento.yapeQrUrl ? (
          // El QR es un asset local entregado por el organizador; no se genera ni altera.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`QR de Yape de ${evento.yapeTitular}`}
            className="h-40 w-40 rounded-xl bg-white object-contain p-2"
            height={160}
            src={evento.yapeQrUrl}
            width={160}
          />
        ) : (
          <p className="max-w-40 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            QR pendiente. Usa el número de Yape mostrado.
          </p>
        )}
      </section>

      <form className="mt-6 space-y-4" onSubmit={enviar}>
        <label className="block">Nombre<input required name="nombrePagador" maxLength={120} className="mt-1 w-full rounded border p-3" /></label>
        <label className="block">Celular<input required name="celular" inputMode="tel" maxLength={30} className="mt-1 w-full rounded border p-3" /></label>
        <label className="block">Correo<input required name="email" type="email" maxLength={254} className="mt-1 w-full rounded border p-3" /></label>
        <label className="block">Entradas<select name="cantidadPersonas" value={cantidad} onChange={(event) => setCantidad(Number(event.target.value))} className="mt-1 w-full rounded border p-3">{Array.from({ length: 20 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label>

        {cantidad > 1 && (
          <fieldset className="space-y-3 rounded-xl border p-4">
            <legend className="px-1 font-semibold">Nombres en las entradas (opcional)</legend>
            <p className="text-sm text-slate-500">Puedes dejar cualquier nombre vacío y completarlo después.</p>
            {Array.from({ length: cantidad }, (_, index) => (
              <label className="block" key={index}>
                Entrada {index + 1}
                <input name="nombresPersonas" maxLength={120} className="mt-1 w-full rounded border p-3" aria-label={`Nombre para entrada ${index + 1}`} />
              </label>
            ))}
          </fieldset>
        )}

        <label className="block">
          Comprobante(s)
          <input required name="comprobantes" type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-1 block" />
          <span className="block text-sm text-slate-500">JPG, PNG o WebP. Reducimos cada imagen a 1600 px antes de enviarla; máximo final 5 MB.</span>
        </label>
        {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
        <button disabled={enviando} className="w-full rounded bg-violet-700 p-3 font-semibold text-white disabled:opacity-60">{enviando ? "Preparando comprobante…" : `Registrar compra — S/ ${total.toFixed(2)}`}</button>
      </form>
    </main>
  );
}
