// Un correo mal escrito no produce error de envío: el servidor lo acepta y
// rebota después, o peor, entrega las entradas a otra persona. Por eso conviene
// detectarlo antes de cobrar, no después.

// Dominios frecuentes en Perú. La lista corta a propósito: cuantos más
// dominios, más falsos positivos sobre correos corporativos legítimos.
const DOMINIOS = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "live.com", "me.com", "protonmail.com", "proton.me",
  "hotmail.es", "outlook.es", "yahoo.es", "gmail.es",
  "hotmail.com.pe", "yahoo.com.pe",
];

function distancia(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let esquina = previa[0];
    previa[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const guardado = previa[j];
      previa[j] = a[i - 1] === b[j - 1] ? esquina : 1 + Math.min(esquina, previa[j], previa[j - 1]);
      esquina = guardado;
    }
  }
  return previa[b.length];
}

/**
 * Devuelve el correo corregido si el dominio se parece mucho a uno frecuente y
 * no es exactamente ese, o `null` si no hay nada que sugerir. Solo sugiere: un
 * dominio corporativo desconocido no se marca.
 */
export function sugerirCorreo(email: string): string | null {
  const limpio = email.trim().toLowerCase();
  const arroba = limpio.lastIndexOf("@");
  if (arroba < 1 || arroba === limpio.length - 1) return null;

  const usuario = limpio.slice(0, arroba);
  const dominio = limpio.slice(arroba + 1);
  if (DOMINIOS.includes(dominio)) return null;

  let mejor: { dominio: string; d: number } | null = null;
  for (const candidato of DOMINIOS) {
    const d = distancia(dominio, candidato);
    // Distancia 1 o 2: "gmial.com", "gmail.con", "hotmai.com". Más lejos ya no
    // es un error de tipeo sino otro dominio.
    if (d <= 2 && (!mejor || d < mejor.d)) mejor = { dominio: candidato, d };
  }
  return mejor ? `${usuario}@${mejor.dominio}` : null;
}
