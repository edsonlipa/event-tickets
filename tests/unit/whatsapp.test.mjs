import assert from "node:assert/strict";
import test from "node:test";

import { enlaceWhatsapp, mensajeEntradasWhatsapp, normalizarNumeroWhatsapp } from "../../src/lib/whatsapp.ts";

const EVENTO = { nombre: "II OPEN CHAMPIONSHIP", fechaHora: "06 de setiembre 2026, 9:00 a. m.", lugar: "Palacio del Deporte" };
const ENTRADAS = [
  { nombre: "Ana Pérez", url: "https://openchampionship.illapa.pe/v/11111111-1111-4111-8111-111111111111" },
  { nombre: null, url: "https://openchampionship.illapa.pe/v/22222222-2222-4222-8222-222222222222" },
];

test("normaliza los formatos con que la gente escribe su celular", () => {
  for (const escrito of ["999888777", "999 888 777", "+51 999 888 777", "051-999-888-777", "0051999888777"]) {
    assert.equal(normalizarNumeroWhatsapp(escrito), "51999888777", escrito);
  }
});

test("conserva un número extranjero que ya trae código de país", () => {
  assert.equal(normalizarNumeroWhatsapp("+56 9 8765 4321"), "56987654321");
});

test("descarta lo que WhatsApp no podría marcar", () => {
  for (const invalido of ["", "   ", "no tengo", "12345", "888777666", "9998887776665554443"]) {
    assert.equal(normalizarNumeroWhatsapp(invalido), null, invalido);
  }
});

test("el mensaje numera cada entrada con su enlace y nombra las anónimas", () => {
  const mensaje = mensajeEntradasWhatsapp({ nombrePagador: "Ana Pérez", evento: EVENTO, entradas: ENTRADAS });
  assert.match(mensaje, /Estas son tus 2 entradas:/);
  assert.match(mensaje, /1\. Ana Pérez\nhttps:\/\/openchampionship\.illapa\.pe\/v\/11111111-1111-4111-8111-111111111111\n/);
  assert.match(mensaje, /2\. Entrada 2\nhttps:\/\/openchampionship\.illapa\.pe\/v\/22222222-2222-4222-8222-222222222222\n/);
  assert.match(mensaje, /Fecha y hora: 06 de setiembre 2026, 9:00 a\. m\./);
  assert.match(mensaje, /Lugar: Palacio del Deporte/);
});

// WhatsApp solo vuelve tocable un enlace que no lleve texto ni puntuación
// pegados; cada URL debe ocupar su línea completa.
test("cada enlace ocupa una línea entera, sin texto ni puntuación alrededor", () => {
  const mensaje = mensajeEntradasWhatsapp({ nombrePagador: "Ana Pérez", evento: EVENTO, entradas: ENTRADAS });
  const lineasConUrl = mensaje.split("\n").filter((linea) => linea.includes("http"));
  assert.equal(lineasConUrl.length, 2);
  for (const linea of lineasConUrl) assert.match(linea, /^https:\/\/\S+$/);
});

test("una sola entrada se anuncia en singular y sin lugar si el evento no lo tiene", () => {
  const mensaje = mensajeEntradasWhatsapp({
    nombrePagador: "Ana",
    evento: { ...EVENTO, lugar: null },
    entradas: [ENTRADAS[0]],
  });
  assert.match(mensaje, /Esta es tu entrada:/);
  assert.doesNotMatch(mensaje, /Lugar:/);
});

test("el enlace codifica el mensaje y cae al selector de contactos sin número", () => {
  const mensaje = mensajeEntradasWhatsapp({ nombrePagador: "Ana", evento: EVENTO, entradas: ENTRADAS });
  const conNumero = enlaceWhatsapp("51999888777", mensaje);
  assert.ok(conNumero.startsWith("https://wa.me/51999888777?text="));
  assert.equal(decodeURIComponent(conNumero.split("?text=")[1]), mensaje);
  assert.ok(enlaceWhatsapp(null, mensaje).startsWith("https://wa.me/?text="));
});
