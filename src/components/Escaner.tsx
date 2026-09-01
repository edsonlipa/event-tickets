"use client";

import type { IScannerControls } from "@zxing/browser";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Precargada = { token: string; nombrePersona: string | null; nombreComprador: string; usado: boolean };
type Resultado = { resultado: "admitido" | "ya_usado" | "anulada" | "no_existe"; nombre_persona?: string | null; usado_previamente_at?: string | null };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
type WakeLockLike = { release(): Promise<void> };
const CLAVE_LISTA = "puerta:precarga:v1";
const CLAVE_COLA = "puerta:cola:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function leerLocal<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; } }
function sonido(ok: boolean) { try { const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.frequency.value = ok ? 880 : 220; oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (ok ? 0.12 : 0.3)); } catch { /* la señal visual sigue funcionando */ } }
function marcarLocalUsado(token: string) { const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []); localStorage.setItem(CLAVE_LISTA, JSON.stringify(lista.map((item) => item.token === token ? { ...item, usado: true } : item))); }
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
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [modoOffline, setModoOffline] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchDisponible, setTorchDisponible] = useState(false);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Array<Record<string, unknown>>>([]);

  const mostrar = useCallback((value: Resultado) => { setResultado(value); sonido(value.resultado === "admitido"); window.setTimeout(() => { setResultado(null); procesando.current = false; }, 1600); }, []);
  const extraerToken = useCallback((texto: string) => { try { const actual = new URL(texto); const esperado = new URL(siteUrl); const token = actual.pathname.match(/^\/v\/([0-9a-f-]+)$/i)?.[1]; return actual.origin === esperado.origin && token && UUID.test(token) ? token : null; } catch { return UUID.test(texto) ? texto : null; } }, [siteUrl]);

  const procesar = useCallback(async (texto: string) => {
    if (procesando.current) return; procesando.current = true;
    const token = extraerToken(texto); if (!token) return mostrar({ resultado: "no_existe" });
    if (navigator.onLine) { try { const response = await fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); if (response.ok) { const value = await response.json() as Resultado; if (value.resultado === "admitido" || value.resultado === "ya_usado") marcarLocalUsado(token); setModoOffline(false); return mostrar(value); } } catch { /* usa precarga */ } }
    setModoOffline(true);
    const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []); const entrada = lista.find((item) => item.token === token); const cola = leerLocal<string[]>(CLAVE_COLA, []);
    if (!entrada) return mostrar({ resultado: "no_existe" });
    if (entrada.usado || cola.includes(token)) return mostrar({ resultado: "ya_usado", nombre_persona: entrada.nombrePersona });
    localStorage.setItem(CLAVE_COLA, JSON.stringify([...cola, token])); mostrar({ resultado: "admitido", nombre_persona: entrada.nombrePersona });
  }, [extraerToken, mostrar]);

  const sincronizar = useCallback(async () => { const cola = leerLocal<string[]>(CLAVE_COLA, []); if (!cola.length) return; try { const response = await fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tokens: cola }) }); if (response.ok) { cola.forEach(marcarLocalUsado); localStorage.setItem(CLAVE_COLA, "[]"); setModoOffline(false); } } catch { setModoOffline(true); } }, []);

  useEffect(() => {
    let stream: MediaStream | undefined; let controls: IScannerControls | undefined; let frame = 0; let wake: WakeLockLike | undefined;
    const iniciar = async () => {
      await prepararShellOffline();
      try { const response = await fetch("/api/puerta/precarga"); if (response.ok) { const body = await response.json() as { entradas: Precargada[] }; localStorage.setItem(CLAVE_LISTA, JSON.stringify(body.entradas)); setModoOffline(false); } } catch { setModoOffline(true); }
      await sincronizar();
      try { wake = await (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockLike> } }).wakeLock?.request("screen"); } catch { /* opcional */ }
      const video = videoRef.current; if (!video) return;
      const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      if (Detector) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); video.srcObject = stream; await video.play();
        const currentTrack = stream.getVideoTracks()[0]; setTrack(currentTrack); const caps = currentTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }; setTorchDisponible(caps.torch === true);
        const detector = new Detector({ formats: ["qr_code"] }); const loop = async () => { const found = await detector.detect(video); if (found[0]) void procesar(found[0].rawValue); frame = requestAnimationFrame(loop); }; frame = requestAnimationFrame(loop);
      } else {
        const { BrowserQRCodeReader } = await import("@zxing/browser"); controls = await new BrowserQRCodeReader().decodeFromConstraints({ video: { facingMode: "environment" } }, video, (found) => { if (found) void procesar(found.getText()); }); controlesRef.current = controls; setTorchDisponible(Boolean(controls.switchTorch));
      }
    };
    void iniciar().catch(() => setModoOffline(true)); window.addEventListener("online", sincronizar);
    return () => { cancelAnimationFrame(frame); controls?.stop(); controlesRef.current = null; stream?.getTracks().forEach((item) => item.stop()); void wake?.release(); window.removeEventListener("online", sincronizar); };
  }, [procesar, sincronizar]);

  async function cambiarTorch() { const next = !torch; if (track) await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); else await controlesRef.current?.switchTorch?.(next); setTorch(next); }
  async function buscarManual(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const q = String(new FormData(event.currentTarget).get("q") ?? ""); if (navigator.onLine) { try { const response = await fetch(`/api/puerta/buscar?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(1200) }); if (response.ok) { setResultadosBusqueda(((await response.json()) as { resultados: Array<Record<string, unknown>> }).resultados); return; } } catch { /* busca en precarga */ } } const termino = q.toLocaleLowerCase("es"); const lista = leerLocal<Precargada[]>(CLAVE_LISTA, []).filter((item) => item.nombreComprador.toLocaleLowerCase("es").includes(termino) || item.nombrePersona?.toLocaleLowerCase("es").includes(termino)); const grupos = new Map<string, Precargada[]>(); lista.forEach((item) => grupos.set(item.nombreComprador, [...(grupos.get(item.nombreComprador) ?? []), item])); setResultadosBusqueda([...grupos.entries()].map(([nombre, items]) => ({ id: nombre, nombreComprador: nombre, celularUltimos3: "---", cantidad: items.length, usadas: items.filter((item) => item.usado).length }))); }

  return <main className="min-h-screen bg-slate-950 p-4 text-white"><header className="mx-auto flex max-w-3xl items-center justify-between"><div><p className="text-sm font-semibold text-violet-300">CONTROL DE ACCESO</p><h1 className="text-2xl font-bold">Escáner</h1></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${modoOffline ? "bg-amber-400 text-black" : "bg-emerald-600"}`}>{modoOffline ? "Modo degradado" : "En línea"}</span></header><section className="relative mx-auto mt-4 max-w-3xl overflow-hidden rounded-2xl bg-black"><video ref={videoRef} muted playsInline className="aspect-[3/4] max-h-[65vh] w-full object-cover" />{torchDisponible && <button onClick={cambiarTorch} className="absolute right-3 top-3 rounded-full bg-black/70 px-4 py-2">{torch ? "Apagar linterna" : "Encender linterna"}</button>}{resultado && <div className={`absolute inset-0 grid place-items-center p-8 text-center ${resultado.resultado === "admitido" ? "bg-emerald-600" : "bg-red-700"}`}><div><strong className="text-5xl">{resultado.resultado === "admitido" ? "PASA" : "NO PASA"}</strong><p className="mt-4 text-2xl">{resultado.nombre_persona || resultado.resultado.replace("_", " ")}</p>{resultado.usado_previamente_at && <p className="mt-2">Usada: {new Date(resultado.usado_previamente_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}</p>}</div></div>}</section><section className="mx-auto mt-6 max-w-3xl rounded-xl bg-white p-4 text-slate-950"><h2 className="text-lg font-bold">Búsqueda manual</h2><form onSubmit={buscarManual} className="mt-3 flex gap-2"><input name="q" required minLength={2} placeholder="Nombre o celular" className="min-w-0 flex-1 rounded border p-3" /><button className="rounded bg-slate-900 px-4 font-semibold text-white">Buscar</button></form><div className="mt-3 space-y-2">{resultadosBusqueda.map((item) => <div key={String(item.id)} className="rounded bg-slate-100 p-3"><strong>{String(item.nombreComprador)}</strong><p className="text-sm">Cel. ***{String(item.celularUltimos3)} · {String(item.cantidad)} entrada(s) · {String(item.usadas)} usada(s)</p></div>)}</div></section></main>;
}
