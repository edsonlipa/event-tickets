/**
 * Copiar al portapapeles funciona en tres escenarios distintos y ninguno cubre
 * a los otros: `navigator.clipboard` no existe fuera de un contexto seguro
 * —la puerta y el panel se prueban por IP en la red local—, varios navegadores
 * embebidos lo bloquean aunque exista, y `execCommand` sigue siendo el único
 * respaldo disponible en esos casos. Devuelve si el texto quedó copiado.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin contexto seguro o con la API bloqueada: se intenta el respaldo.
  }

  try {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.cssText = "position:fixed;top:0;opacity:0";
    document.body.appendChild(campo);
    campo.select();
    const copiado = document.execCommand("copy");
    document.body.removeChild(campo);
    return copiado;
  } catch {
    return false;
  }
}
