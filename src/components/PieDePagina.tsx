import { LogoIllapa } from "@/components/LogoIllapa";

export function PieDePagina() {
  return (
    <footer className="mx-auto mt-10 max-w-md border-t-2 border-ink/10 px-3 pt-6 text-center text-xs text-neutral-500">
      <p className="flex items-center justify-center gap-2 font-black tracking-[0.14em] text-ink/70 uppercase">
        <LogoIllapa className="h-7 w-7 shrink-0" />
        Illapa Systems
      </p>
      <p className="mt-3">
        ¿Organizas un evento?{" "}
        <a href="mailto:admin@illapasystems.com" className="font-bold text-event-blue underline decoration-2 underline-offset-4">
          admin@illapasystems.com
        </a>
      </p>
    </footer>
  );
}
