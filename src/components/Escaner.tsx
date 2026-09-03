"use client";

import type { IScannerControls } from "@zxing/browser";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { presentarResultadoPuerta, type ResultadoPuerta } from "@/lib/resultado-puerta";

type Precargada = { token: string; nombrePersona: string | null; nombreComprador: string; usado: boolean; ingresoAt: string | null };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
type WakeLockLike = { release(): Promise<void> };
const CLAVE_LISTA = "puerta:precarga:v1";
const CLAVE_COLA = "puerta:cola:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function leerLocal<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; } }
// El navegador puede rechazar la escritura por cuota o por bloqueo del usuario.
// La realimentación al guardia nunca debe depender de que esto funcione, así que
// se devuelve el resultado en vez de dejar escapar la excepción.
function guardarLocal(key: string, valor: string) { try { localStorage.setItem(key, valor); return true; } catch { return false; } }
function sonido(ok: boolean) { try { const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.frequency.value = ok ? 880 : 220; oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (ok ? 0.12 : 0.3)); } catch { /* la señal visual sigue funcionando */ } }
function marcarLocalUsado(token: string, ingresoAt?: string | null) { const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []); return guardarLocal(CLAVE_LISTA, JSON.stringify(lista.map((item) => item.token === token ? { ...item, usado: true, ingresoAt: ingresoAt ?? item.ingresoAt } : item))); }
async function prepararShellOffline() {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) return;
  const urls = performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => url.startsWith(location.origin) && (url.includes("/_next/") || url.endsWith("/manifest.json")));
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(resolve, 3000);
    channel.port1.onmessage = () => { window.clearTimeout(timeout); resolve(); };
    worker.postMessage({ type: "CACHE_URLS", urls }, [channel.port2]);
  });
}

export function Escaner({ siteUrl }: { siteUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const procesando = useRef(false);
  const controlesRef = useRef<IScannerControls | null>(null);
  const [resultado, setResultado] = useState<ResultadoPuerta | null>(null);
  const [modoOffline, setModoOffline] = useState(false);
  const [sinAlmacenamiento, setSinAlmacenamiento] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchDisponible, setTorchDisponible] = useState(false);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [errorCamara, setErrorCamara] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Array<Record<string, unknown>>>([]);

  const mostrar = useCallback((value: ResultadoPuerta) => { setResultado(value); sonido(value.resultado === "admitido"); window.setTimeout(() => { setResultado(null); procesando.current = false; }, 2200); }, []);
  const extraerToken = useCallback((texto: string) => { try { const actual = new URL(texto); const esperado = new URL(siteUrl); const token = actual.pathname.match(/^\/v\/([0-9a-f-]+)$/i)?.[1]; return actual.origin === esperado.origin && token && UUID.test(token) ? token : null; } catch { return UUID.test(texto) ? texto : null; } }, [siteUrl]);

  const procesar = useCallback(async (texto: string) => {
    if (procesando.current) return; procesando.current = true;
    const token = extraerToken(texto); if (!token) return mostrar({ resultado: "no_existe" });
    if (navigator.onLine) { try { const response = await fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); if (response.ok) { const value = await response.json() as ResultadoPuerta; if (value.resultado === "admitido" || value.resultado === "ya_usado") marcarLocalUsado(token, value.ingreso_at); setModoOffline(false); return mostrar(value); } } catch { /* usa precarga */ } }
    setModoOffline(true);
    const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []); const entrada = lista.find((item) => item.token === token); const cola = leerLocal<string[]>(CLAVE_COLA, []);
    if (!entrada) return mostrar({ resultado: "no_existe" });
    const nombre = entrada.nombrePersona || entrada.nombreComprador;
    if (entrada.usado || cola.includes(token)) return mostrar({ resultado: "ya_usado", nombre_persona: nombre, ingreso_at: entrada.ingresoAt });
    // El aviso al guardia va siempre: si la cola no se puede persistir, el
    // ingreso es valido igualmente y lo que corresponde es advertirlo, no callar.
    if (!guardarLocal(CLAVE_COLA, JSON.stringify([...cola, token]))) setSinAlmacenamiento(true);
    mostrar({ resultado: "admitido", nombre_persona: nombre });
  }, [extraerToken, mostrar]);

  const sincronizar = useCallback(async () => { const cola = leerLocal<string[]>(CLAVE_COLA, []); if (!cola.length) return; try { const response = await fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tokens: cola }) }); if (response.ok) { const body = await response.json() as { resultados: Array<{ token: string; ingreso_at?: string | null }> }; body.resultados.forEach((item) => marcarLocalUsado(item.token, item.ingreso_at)); if (!guardarLocal(CLAVE_COLA, "[]")) setSinAlmacenamiento(true); setModoOffline(false); } } catch { setModoOffline(true); } }, []);

  useEffect(() => {
    let stream: MediaStream | undefined; let controls: IScannerControls | undefined; let frame = 0; let wake: WakeLockLike | undefined;
    const iniciar = async () => {
      await prepararShellOffline();
      try { const response = await fetch("/api/puerta/precarga"); if (response.ok) { const body = await response.json() as { entradas: Precargada[] }; if (!guardarLocal(CLAVE_LISTA, JSON.stringify(body.entradas))) setSinAlmacenamiento(true); setModoOffline(false); } } catch { setModoOffline(true); }
      await sincronizar();
      try { wake = await (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockLike> } }).wakeLock?.request("screen"); } catch { /* opcional */ }
      const video = videoRef.current; if (!video) return;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setErrorCamara("La cámara necesita HTTPS. Abre el despliegue seguro; mientras tanto puedes usar la búsqueda manual.");
        return;
      }
      const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      if (Detector) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); video.srcObject = stream; await video.play();
        const currentTrack = stream.getVideoTracks()[0]; setTrack(currentTrack); const caps = currentTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }; setTorchDisponible(caps.torch === true);
        const detector = new Detector({ formats: ["qr_code"] }); const loop = async () => { const found = await detector.detect(video); if (found[0]) void procesar(found[0].rawValue); frame = requestAnimationFrame(loop); }; frame = requestAnimationFrame(loop);
      } else {
        const { BrowserQRCodeReader } = await import("@zxing/browser"); controls = await new BrowserQRCodeReader().decodeFromConstraints({ video: { facingMode: "environment" } }, video, (found) => { if (found) void procesar(found.getText()); }); controlesRef.current = controls; setTorchDisponible(Boolean(controls.switchTorch));
      }
    };
    void iniciar().catch((error: unknown) => {
      setModoOffline(true);
      const nombre = error instanceof DOMException ? error.name : "";
      setErrorCamara(nombre === "NotAllowedError" ? "Permite el acceso a la cámara en la configuración del navegador y vuelve a abrir el escáner." : nombre === "NotFoundError" ? "No se encontró una cámara disponible en este dispositivo." : "No se pudo iniciar la cámara. Recarga la vista o utiliza la búsqueda manual.");
    }); window.addEventListener("online", sincronizar);
    return () => { cancelAnimationFrame(frame); controls?.stop(); controlesRef.current = null; stream?.getTracks().forEach((item) => item.stop()); void wake?.release(); window.removeEventListener("online", sincronizar); };
  }, [procesar, sincronizar]);

  async function cambiarTorch() { const next = !torch; if (track) await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); else await controlesRef.current?.switchTorch?.(next); setTorch(next); }
  async function buscarManual(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const q = String(new FormData(event.currentTarget).get("q") ?? ""); if (navigator.onLine) { try { const response = await fetch(`/api/puerta/buscar?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(1200) }); if (response.ok) { setResultadosBusqueda(((await response.json()) as { resultados: Array<Record<string, unknown>> }).resultados); return; } } catch { /* busca en precarga */ } } const termino = q.toLocaleLowerCase("es"); const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []).filter((item) => item.nombreComprador.toLocaleLowerCase("es").includes(termino) || item.nombrePersona?.toLocaleLowerCase("es").includes(termino)); const grupos = new Map<string, Precargada[]>(); lista.forEach((item) => grupos.set(item.nombreComprador, [...(grupos.get(item.nombreComprador) ?? []), item])); setResultadosBusqueda([...grupos.entries()].map(([nombre, items]) => ({ id: nombre, nombreComprador: nombre, celularUltimos3: "---", cantidad: items.length, usadas: items.filter((item) => item.usado).length }))); }

  const presentacion = resultado ? presentarResultadoPuerta(resultado) : null;

  return <main className="min-h-screen bg-ink p-4 text-cream"><header className="mx-auto flex max-w-3xl items-center justify-between border-b-4 border-event-yellow pb-4"><div><p className="text-xs font-black tracking-[0.18em] text-event-yellow uppercase">Control de acceso</p><h1 className="text-3xl font-black uppercase">Escáner</h1></div><span className={`px-3 py-1 text-sm font-black uppercase ${modoOffline ? "bg-event-yellow text-ink" : "bg-emerald-600 text-white"}`}>{modoOffline ? "Modo degradado" : "En línea"}</span></header>{sinAlmacenamiento && <p role="alert" className="mx-auto mt-4 max-w-3xl border-l-8 border-event-red bg-event-red px-4 py-3 text-sm font-black text-white uppercase">Sin almacenamiento: anota los ingresos a mano</p>}{errorCamara && <p role="alert" className="mx-auto mt-4 max-w-3xl border-l-8 border-event-yellow bg-white p-4 font-bold text-ink">{errorCamara}</p>}<section className="relative mx-auto mt-4 max-w-3xl overflow-hidden border-4 border-cream bg-black shadow-[6px_6px_0_var(--event-red)]"><video ref={videoRef} muted playsInline className="aspect-[3/4] max-h-[65vh] w-full object-cover" />{torchDisponible && <button onClick={cambiarTorch} className="absolute right-3 top-3 bg-ink/90 px-4 py-2 font-black text-event-yellow uppercase">{torch ? "Apagar linterna" : "Encender linterna"}</button>}{presentacion && <div role="status" className={`absolute inset-0 grid place-items-center p-8 text-center ${presentacion.admitido ? "bg-emerald-600" : "bg-red-700"}`}><div><strong className="text-5xl font-black">{presentacion.titulo}</strong>{presentacion.nombre && <p className="mt-4 text-2xl font-bold uppercase">{presentacion.nombre}</p>}{presentacion.motivo && <p className="mt-3 text-lg font-black uppercase">{presentacion.motivo}</p>}{presentacion.hora && <p className="mt-2 text-lg font-semibold">{presentacion.hora}</p>}{presentacion.admitido && !presentacion.hora && modoOffline && <p className="mt-2 text-sm font-bold uppercase">Pendiente de sincronización</p>}</div></div>}</section><section className="mx-auto mt-7 max-w-3xl bg-white p-5 text-ink shadow-[5px_5px_0_var(--event-yellow)]"><p className="event-kicker">Respaldo</p><h2 className="text-xl font-black uppercase">Búsqueda manual</h2><form suppressHydrationWarning onSubmit={buscarManual} className="mt-4 flex gap-2"><input suppressHydrationWarning name="q" required minLength={2} placeholder="Nombre o celular" className="event-input min-w-0 flex-1" /><button className="event-button-dark">Buscar</button></form><div className="mt-4 space-y-2">{resultadosBusqueda.map((item) => <div key={String(item.id)} className="border-l-8 border-event-blue bg-cream p-3"><strong className="[overflow-wrap:anywhere]">{String(item.nombreComprador)}</strong><p className="text-sm">Cel. ***{String(item.celularUltimos3)} · {String(item.cantidad)} entrada(s) · {String(item.usadas)} usada(s)</p></div>)}</div></section></main>;
}
