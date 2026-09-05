export type TipoCorreo = "acuse" | "entradas" | "rechazo";

export type FalloCorreo = {
  tipo: TipoCorreo;
  causa: string;
  queHacer: string;
  temporal: boolean;
  detalle: string;
  intentoAt: string | null;
};

const ETIQUETA: Record<TipoCorreo, string> = {
  acuse: "acuse de compra",
  entradas: "entradas con QR",
  rechazo: "aviso de rechazo",
};

export function etiquetaTipo(tipo: TipoCorreo) {
  return ETIQUETA[tipo];
}

// El operador necesita una sola decisión: esperar o actuar. Un fallo temporal se
// resuelve solo cuando el cron reintenta; uno permanente no se arregla por más
// que reintente, así que exige contactar al comprador o revisar el proveedor.
const REGLAS: Array<{ patron: RegExp; causa: string; queHacer: string; temporal: boolean }> = [
  {
    patron: /550[\s-]*5\.1\.1|mailbox\s*(not\s*found|unavailable)|user\s*unknown|recipient\s*not\s*found|no\s*such\s*user|address\s*rejected/i,
    causa: "La dirección de correo no existe",
    queHacer: "Contacta al comprador: es muy probable que se haya equivocado al escribirla.",
    temporal: false,
  },
  {
    patron: /55[02][\s-]*5\.7|blocked|spam|blacklist|reputation|policy\s*rejection|denied/i,
    causa: "El servidor del destinatario rechazó el correo",
    queHacer: "Suele ser un filtro de spam. Contacta al comprador por otro medio para confirmar la entrega.",
    temporal: false,
  },
  {
    patron: /552|quota|mailbox\s*full|insufficient\s*storage|over\s*quota/i,
    causa: "El buzón del destinatario está lleno",
    queHacer: "El comprador debe liberar espacio. El sistema seguirá reintentando mientras tanto.",
    temporal: true,
  },
  {
    patron: /domain\s*(is\s*)?not\s*verified|unverified|api\s*key|unauthorized|invalid\s*credentials|authentication/i,
    causa: "Problema de configuración del proveedor de correo",
    queHacer: "No es culpa del comprador. Revisa las credenciales y el dominio verificado en el proveedor.",
    temporal: false,
  },
  {
    patron: /rate\s*limit|too\s*many\s*requests|429/i,
    causa: "Se alcanzó el límite de envíos del proveedor",
    queHacer: "Se resolverá solo al bajar el ritmo de envío. El sistema reintentará.",
    temporal: true,
  },
  {
    patron: /421|4\.\d\.\d|timeout|timed\s*out|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket|network/i,
    causa: "Problema temporal de red o del proveedor",
    queHacer: "No hace falta hacer nada: el sistema lo reintentará automáticamente.",
    temporal: true,
  },
];

export function interpretarFallo(detalle: string): Pick<FalloCorreo, "causa" | "queHacer" | "temporal"> {
  for (const regla of REGLAS) {
    if (regla.patron.test(detalle)) return { causa: regla.causa, queHacer: regla.queHacer, temporal: regla.temporal };
  }
  return {
    causa: "No se pudo enviar el correo",
    queHacer: "Revisa el detalle técnico. El sistema seguirá reintentando.",
    temporal: true,
  };
}
