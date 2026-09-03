/* eslint-disable @next/next/no-img-element -- las vistas previas usan URLs blob locales */
"use client";

import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { PieDePagina } from "@/components/PieDePagina";

const sinSuscripcion = () => () => {};
const BORRADOR_KEY = "compra:borrador:v1";

// El navegador puede rechazar el almacenamiento por cuota o por bloqueo del
// usuario (Safari con "Bloquear todas las cookies", modo privado, políticas de
// empresa). El borrador es una comodidad, no parte de la compra: si no se puede
// guardar, la compra debe seguir. Incluso el `catch` del efecto de lectura
// necesita esta tolerancia, porque ahí `removeItem` vuelve a lanzar.
function leerBorrador() {
  try { return localStorage.getItem(BORRADOR_KEY); } catch { return null; }
}
function guardarBorrador(valor: string) {
  try { localStorage.setItem(BORRADOR_KEY, valor); } catch { /* se sigue sin borrador */ }
}
function olvidarBorrador() {
  try { localStorage.removeItem(BORRADOR_KEY); } catch { /* se sigue sin borrador */ }
}
const MAX_LADO = 1600;
type Evento = { nombre: string; fecha: string; lugar: string | null; precioUnitario: number; yapeNumero: string; yapeTitular: string; yapeQrUrl: string | null };
type Datos = { nombre: string; celular: string; email: string; cantidad: number; nombres: string[] };
type Pago = { id: string; monto: string; archivo: File | null; preview: string | null };
const inicio: Datos = { nombre: "", celular: "", email: "", cantidad: 1, nombres: [""] };
const pagoNuevo = (id: string, monto = ""): Pago => ({ id, monto, archivo: null, preview: null });
const centimos = (valor: string) => Math.round(Number(valor) * 100);
const moneda = (valor: number) => `S/ ${(valor / 100).toFixed(2)}`;

async function comprimir(file: File) {
  const url = URL.createObjectURL(file);
  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
  URL.revokeObjectURL(url);
  const escala = Math.min(1, MAX_LADO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala)); canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tu navegador no pudo preparar el comprobante.");
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
  if (!blob) throw new Error(`No pudimos comprimir ${file.name}.`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "comprobante"}.jpg`, { type: "image/jpeg" });
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="event-label">{label}</span>{children}</label>;
}

export function FormularioCompra({ evento }: { evento: Evento }) {
  const router = useRouter();
  const formDatos = useRef<HTMLFormElement>(null);
  const proximoPago = useRef(2);
  const nombreCompradorAnterior = useRef("");
  const [paso, setPaso] = useState<1 | 2>(1);
  const [datos, setDatos] = useState<Datos>(inicio);
  const total = Math.round(datos.cantidad * evento.precioUnitario * 100);
  const [pagos, setPagos] = useState<Pago[]>([pagoNuevo("pago-1", evento.precioUnitario.toFixed(2))]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copia, setCopia] = useState<"" | "ok" | "error">("");
  // Los botones de envío nacen deshabilitados en el HTML del servidor y solo se
  // habilitan cuando React toma el control. Si el bundle no carga o la hidratación
  // falla, `Siguiente` haría un envío nativo del form: navegación a la misma URL y
  // pérdida de todo lo escrito. Deshabilitado tampoco dispara el envío implícito
  // al pulsar Enter.
  const hidratado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const [imagenesPendientes, setImagenesPendientes] = useState(false);
  const [borradorListo, setBorradorListo] = useState(false);
  const suma = pagos.reduce((acum, pago) => acum + (Number.isFinite(centimos(pago.monto)) ? centimos(pago.monto) : 0), 0);
  const diferencia = total - suma;
  const listo = pagos.every((p) => p.archivo && Number(p.monto) > 0) && diferencia === 0;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = leerBorrador();
      if (!raw) {
        timer = setTimeout(() => setBorradorListo(true), 0);
        return () => { if (timer) clearTimeout(timer); };
      }
      const draft = JSON.parse(raw) as { paso?: number; datos?: Datos; pagos?: { monto: string }[] };
      if (!draft.datos || !Array.isArray(draft.pagos)) {
        olvidarBorrador();
        timer = setTimeout(() => setBorradorListo(true), 0);
        return () => { if (timer) clearTimeout(timer); };
      }
      const cantidad = Math.min(20, Math.max(1, Number(draft.datos.cantidad) || 1));
      timer = setTimeout(() => {
        setDatos({ ...inicio, ...draft.datos, cantidad, nombres: Array.from({ length: cantidad }, (_, i) => draft.datos?.nombres?.[i] ?? "") });
        setPagos((draft.pagos!.length ? draft.pagos! : [{ monto: (cantidad * evento.precioUnitario).toFixed(2) }]).map((p, i) => ({ ...pagoNuevo(`pago-${i + 1}`), monto: String(p.monto) })));
        setPaso(draft.paso === 2 ? 2 : 1); setImagenesPendientes(draft.paso === 2 && draft.pagos!.length > 0); proximoPago.current = Math.max(2, draft.pagos!.length + 1);
        setBorradorListo(true);
      }, 0);
    } catch {
      olvidarBorrador();
      timer = setTimeout(() => setBorradorListo(true), 0);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [evento.precioUnitario]);

  useEffect(() => {
    if (!borradorListo) return;
    const vacio = paso === 1 && datos.nombre === "" && datos.celular === "" && datos.email === "" && datos.cantidad === 1 && pagos.length === 1;
    if (vacio) olvidarBorrador();
    else guardarBorrador(JSON.stringify({ paso, datos, pagos: pagos.map(({ monto }) => ({ monto })) }));
  }, [borradorListo, paso, datos, pagos]);

  useEffect(() => {
    if (pagos.length !== 1) return;
    const automatico = (total / 100).toFixed(2);
    if (pagos[0].monto === automatico) return;
    const timer = setTimeout(() => setPagos((lista) => [{ ...lista[0], monto: automatico }]), 0);
    return () => clearTimeout(timer);
  }, [pagos, total]);

  useEffect(() => {
    const anterior = nombreCompradorAnterior.current;
    nombreCompradorAnterior.current = datos.nombre;
    if (datos.nombres[0] !== "" && datos.nombres[0] !== anterior) return;
    if (datos.nombres[0] === datos.nombre) return;
    const timer = setTimeout(() => setDatos((actual) => ({
      ...actual,
      nombres: actual.nombres.map((nombre, index) => index === 0 ? actual.nombre : nombre),
    })), 0);
    return () => clearTimeout(timer);
  }, [datos.nombre, datos.nombres]);

  function cantidad(nueva: number) {
    const valor = Math.min(20, Math.max(1, nueva));
    setDatos((d) => ({ ...d, cantidad: valor, nombres: Array.from({ length: valor }, (_, i) => d.nombres[i] ?? "") }));
    if (pagos.length === 1) setPagos((p) => [{ ...p[0], monto: (valor * evento.precioUnitario).toFixed(2) }]);
  }
  function cambiarPago(id: string, cambio: Partial<Pago>) { setPagos((lista) => lista.map((p) => p.id === id ? { ...p, ...cambio } : p)); }
  function archivo(id: string, file: File | null) { setPagos((lista) => lista.map((p) => { if (p.id !== id) return p; if (p.preview) URL.revokeObjectURL(p.preview); return { ...p, archivo: file, preview: file ? URL.createObjectURL(file) : null }; })); setImagenesPendientes(false); }
  function avisarCopia(estado: "ok" | "error") {
    setCopia(estado);
    window.setTimeout(() => setCopia(""), estado === "ok" ? 2200 : 6000);
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(evento.yapeNumero);
      return avisarCopia("ok");
    } catch {
      // `navigator.clipboard` no existe fuera de HTTPS y varios navegadores
      // embebidos de redes sociales lo bloquean; se intenta el respaldo.
    }
    try {
      const campo = document.createElement("textarea");
      campo.value = evento.yapeNumero;
      campo.setAttribute("readonly", "");
      campo.style.cssText = "position:fixed;top:0;opacity:0";
      document.body.appendChild(campo);
      campo.select();
      const copiado = document.execCommand("copy");
      document.body.removeChild(campo);
      avisarCopia(copiado ? "ok" : "error");
    } catch {
      avisarCopia("error");
    }
  }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!listo) return; setEnviando(true); setError("");
    try {
      const body = new FormData(); body.set("nombrePagador", datos.nombre.trim()); body.set("celular", datos.celular.trim()); body.set("email", datos.email.trim()); body.set("cantidadPersonas", String(datos.cantidad));
      datos.nombres.forEach((n) => body.append("nombresPersonas", n.trim()));
      for (const p of pagos) { body.append("comprobantes", await comprimir(p.archivo!)); body.append("montosComprobantes", p.monto); }
      const response = await fetch("/api/registros", { method: "POST", body }); const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "No pudimos registrar tu compra.");
      olvidarBorrador(); router.push(`/gracias/${result.id}`);
    } catch (e) { setEnviando(false); setError(e instanceof Error ? e.message : "No pudimos registrar tu compra."); }
  }

  return <main data-compra-pasos className="event-compra-shell min-h-dvh bg-cream px-3 pt-5 text-ink sm:px-6 sm:pt-10"><div className="mx-auto max-w-md"><div className="relative z-10 mb-4 overflow-hidden shadow-brutal-sm"><NextImage src="/evento-banner.png" alt="II Open Championship" width={719} height={344} priority className="h-auto w-full" /></div>
    <header className="relative mb-7"><span className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-event-red" aria-hidden /><span className="absolute -left-2 bottom-1 h-14 w-14 rotate-45 bg-event-blue" aria-hidden /><div className="relative bg-ink p-5 text-cream shadow-brutal-sm"><div className="mb-3 flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-event-red" /><span className="text-xs font-extrabold tracking-[.18em] text-event-yellow uppercase">Evento limitado</span></div><h1 className="[overflow-wrap:anywhere] text-4xl font-black leading-[.92] tracking-[-.045em] uppercase">{evento.nombre}</h1><div className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-3 text-sm font-semibold"><div><span className="block text-[.65rem] tracking-widest text-event-yellow uppercase">Fecha y hora</span>{evento.fecha}</div><span className="h-9 w-px bg-cream/20" /><div><span className="block text-[.65rem] tracking-widest text-event-yellow uppercase">Lugar</span>{evento.lugar ?? "Por confirmar"}</div></div></div></header>
    <div className="mb-3 flex items-center justify-between text-xs font-black tracking-[.1em] uppercase"><span>Paso {paso} de 2 — {paso === 1 ? "Tus datos" : "Pago"}</span><span className="bg-event-yellow px-2 py-1">Total {moneda(total)}</span></div><div className="mb-5 grid grid-cols-2 gap-2" aria-hidden><span className="h-1 bg-event-red" /><span className={`h-1 ${paso === 2 ? "bg-event-red" : "bg-ink/15"}`} /></div>
    <div key={paso} className="motion-safe:animate-[step-in_.22s_ease-out]">{paso === 1 ?
      <form ref={formDatos} onSubmit={(e) => { e.preventDefault(); if (formDatos.current?.reportValidity()) { setError(""); setPaso(2); } }} className="event-panel space-y-5"><div><h2 className="text-2xl font-black uppercase">Entrada general</h2><p className="text-sm text-neutral-500">Completa tus datos antes de realizar el pago.</p><p className="mt-3 border-l-4 border-event-yellow bg-cream px-3 py-2 text-sm font-bold">Niños mayores de 5 años pagan entrada.</p></div>
        <Campo label="Nombre del comprador"><input aria-label="Nombre del comprador" required value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} maxLength={120} autoComplete="name" placeholder="María Fernández" className="ticket-input" /></Campo>
        <div className="grid grid-cols-2 gap-4"><Campo label="Celular"><input aria-label="Celular" required value={datos.celular} onChange={(e) => setDatos({ ...datos, celular: e.target.value })} inputMode="tel" maxLength={30} autoComplete="tel" placeholder="999 888 777" className="ticket-input" /></Campo><div><span className="event-label">Entradas</span><div className="flex h-11 items-center border-2 border-ink/20"><button type="button" aria-label="Reducir entradas" onClick={() => cantidad(datos.cantidad - 1)} disabled={datos.cantidad === 1} className="h-full w-11 text-xl font-black disabled:opacity-25">−</button><output aria-label="Entradas" className="flex-1 text-center text-lg font-black">{datos.cantidad}</output><button type="button" aria-label="Aumentar entradas" onClick={() => cantidad(datos.cantidad + 1)} disabled={datos.cantidad === 20} className="h-full w-11 text-xl font-black disabled:opacity-25">+</button></div></div></div>
        <Campo label="Correo"><input aria-label="Correo" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} type="email" autoComplete="email" maxLength={254} placeholder="maria@correo.com" className="ticket-input" /></Campo>
        {datos.cantidad > 1 && <fieldset className="border-2 border-dashed border-ink/15 p-4"><legend className="px-1 text-xs font-bold tracking-wider text-neutral-500 uppercase">Nombres en las entradas (opcional)</legend><div className="mt-2 space-y-3">{datos.nombres.map((n, i) => <label className="flex items-center gap-3" key={i}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-event-yellow text-xs font-black">{i + 1}</span><input value={n} onChange={(e) => setDatos({ ...datos, nombres: datos.nombres.map((actual, indice) => indice === i ? e.target.value : actual) })} maxLength={120} className="ticket-input py-1.5 text-sm" aria-label={`Nombre para entrada ${i + 1}`} placeholder={`Persona ${i + 1}`} /></label>)}</div></fieldset>}
        <div className="grid gap-3 pt-2"><button type="submit" disabled={!hidratado} className="event-button">{hidratado ? "Siguiente" : "Cargando…"}</button>{!hidratado && <p role="status" className="text-center text-xs font-bold text-neutral-600">Estamos preparando el formulario. Si este aviso no desaparece, revisa tu conexión y recarga la página.</p>}</div></form> :
      <form onSubmit={enviar} className="overflow-hidden bg-white shadow-[0_0_0_1px_rgba(28,28,28,.12)]"><section className="border-b-2 border-dashed border-ink/20 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black uppercase">Revisa tu compra</h2><p className="text-sm text-neutral-500">Confirma tus datos antes de pagar.</p></div><button type="button" onClick={() => setPaso(1)} className="text-xs font-black text-event-blue underline decoration-2 underline-offset-4">Editar datos</button></div><dl className="mt-5 grid gap-3 text-sm"><div><dt className="event-label">Comprador</dt><dd className="font-bold">{datos.nombre}</dd></div><div className="grid grid-cols-2 gap-3"><div><dt className="event-label">Celular</dt><dd className="font-bold">{datos.celular}</dd></div><div><dt className="event-label">Entradas</dt><dd className="font-bold">{datos.cantidad}</dd></div></div><div><dt className="event-label">Correo</dt><dd className="break-all font-bold">{datos.email}</dd></div>{datos.nombres.some(Boolean) && <div><dt className="event-label">Nombres asignados</dt><dd className="font-bold">{datos.nombres.filter(Boolean).join(", ")}</dd></div>}</dl></section>
        <section className="p-5"><p className="event-kicker">Paga con Yape</p><h2 className="mb-5 text-xl font-black uppercase">Sigue estos pasos</h2><div className="mb-5 grid grid-cols-[7.25rem_1fr] gap-3 border-2 border-ink/10 p-3"><div className="grid aspect-square place-items-center bg-white p-1 text-center text-[.62rem] font-bold ring-1 ring-ink/10">{evento.yapeQrUrl ? <NextImage src={evento.yapeQrUrl} alt={`QR de Yape de ${evento.yapeTitular}`} width={116} height={116} className="h-full w-full object-contain" /> : <span>QR YAPE<br />NO DISPONIBLE</span>}</div><div className="min-w-0 self-center"><span className="event-label">Número Yape</span><strong className="block break-all text-xl">{evento.yapeNumero}</strong><button type="button" onClick={copiar} data-copia={copia || undefined} aria-label={copia === "ok" ? "Número copiado" : "Copiar número"} className="text-xs font-black text-event-blue underline underline-offset-4">{copia === "ok" ? "Número copiado" : "Copiar número"}</button><span role="status" aria-live="polite" className={`ml-2 align-middle text-xs font-black ${copia === "error" ? "text-event-red" : "text-emerald-700"}`}>{copia === "ok" ? "¡Copiado!" : copia === "error" ? "Copia no permitida" : ""}</span><span className="event-label mt-3">Monto exacto</span><strong className="text-2xl">{moneda(total)}</strong><p className="text-xs text-neutral-500">{evento.yapeTitular}</p></div></div>{!evento.yapeQrUrl && <p className="event-note mb-5">El QR aún no está disponible. Yapea al número mostrado.</p>}
        <div className="space-y-4">{pagos.map((p, i) => <fieldset key={p.id} className="border-2 border-ink/10 p-4"><legend className="px-1 text-xs font-black tracking-wider uppercase">Pago {i + 1}</legend><div className="space-y-4"><Campo label="Monto pagado"><input aria-label={i ? `Monto pagado ${i + 1}` : "Monto pagado"} value={p.monto} onChange={(e) => cambiarPago(p.id, { monto: e.target.value })} readOnly={pagos.length === 1} inputMode="decimal" className="ticket-input read-only:text-neutral-500" /></Campo><label className="block"><span className="event-label">Comprobante</span><span onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); archivo(p.id, e.dataTransfer.files[0] ?? null); }} className="grid min-h-28 cursor-pointer grid-cols-[1fr_4.5rem] items-center gap-3 border-2 border-dashed border-ink/20 p-3"><span className="text-sm font-bold">{p.archivo ? "Reemplazar imagen" : "Toma una foto o selecciona tu archivo"}<small className="mt-1 block font-normal text-neutral-500">JPG, PNG o WebP · máx. 5 MB</small></span>{p.preview ? <img src={p.preview} alt="Vista previa del comprobante" className="h-16 w-16 object-cover" /> : <span className="grid h-16 w-16 place-items-center bg-cream text-3xl" aria-hidden>↑</span>}<input aria-label={i ? `Comprobante ${i + 1}` : "Comprobante(s)"} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => archivo(p.id, e.target.files?.[0] ?? null)} /></span></label></div>{pagos.length > 1 && <button type="button" onClick={() => { if (p.preview) URL.revokeObjectURL(p.preview); setPagos((lista) => lista.filter((item) => item.id !== p.id)); }} className="mt-3 text-xs font-black text-event-red underline underline-offset-4">Quitar pago</button>}</fieldset>)}</div>
        <button type="button" onClick={() => setPagos((lista) => [...lista, pagoNuevo(`pago-${proximoPago.current++}`)])} className="mt-4 text-xs font-semibold text-neutral-500 underline decoration-1 underline-offset-4">¿Necesitas dividir el pago?</button>{imagenesPendientes && <p role="status" className="mt-4 border-l-4 border-event-yellow bg-cream p-3 text-sm">Restauramos tus datos. Por seguridad, vuelve a seleccionar cada comprobante.</p>}{diferencia !== 0 && <p role="status" className="mt-4 text-center text-sm font-bold text-event-red">{diferencia > 0 ? `Falta declarar ${moneda(diferencia)}.` : `El monto excede el total por ${moneda(Math.abs(diferencia))}.`}</p>}{error && <p role="alert" className="mt-4 bg-event-red px-3 py-2 text-sm font-semibold text-white">{error}</p>}<div className="mt-5 grid gap-3"><button type="submit" disabled={!hidratado || enviando || !listo} className="event-button">{!hidratado ? "Cargando…" : enviando ? "Preparando comprobantes…" : "Registrar compra"}</button></div><p className="mt-4 text-center text-xs text-neutral-500">Revisaremos tu pago y enviaremos un correo de recepción. La confirmación con tus entradas llegará después.</p></section></form>}
    </div><a href="/reenviar" className="mt-6 block text-center text-sm font-semibold text-event-blue underline decoration-2 underline-offset-4">¿No llegó tu correo? Reenviar entradas</a></div><PieDePagina /></main>;
}
