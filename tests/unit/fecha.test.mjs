import assert from "node:assert/strict";
import test from "node:test";

import { formatearFecha, formatearFechaCsv, formatearFechaHora, formatearHora, ZONA_HORARIA_PERU } from "../../src/lib/fecha.ts";

const EVENTO = "2026-09-06T14:00:00.000Z";
const CERCA_DE_MEDIANOCHE = "2026-09-03T04:59:59.000Z";

test("usa America/Lima como zona de negocio", () => {
  assert.equal(ZONA_HORARIA_PERU, "America/Lima");
  assert.equal(formatearFecha(EVENTO), "06 de setiembre 2026");
  assert.equal(formatearHora(EVENTO), "9:00 a. m.");
  assert.equal(formatearFechaHora(EVENTO), "06 de setiembre 2026, 9:00 a. m.");
  assert.equal(formatearFechaCsv(EVENTO), "2026-09-06 09:00:00");
  assert.equal(formatearFechaCsv(CERCA_DE_MEDIANOCHE), "2026-09-02 23:59:59");
});

test("produce el mismo resultado con procesos configurados en otras zonas", () => {
  const zonaOriginal = process.env.TZ;
  const resultados = ["UTC", "Asia/Tokyo", "Pacific/Auckland"].map((zona) => {
    process.env.TZ = zona;
    return [formatearFecha(EVENTO), formatearFechaHora(EVENTO), formatearHora(EVENTO), formatearFechaCsv(CERCA_DE_MEDIANOCHE)];
  });
  process.env.TZ = zonaOriginal;
  assert.deepEqual(resultados[1], resultados[0]);
  assert.deepEqual(resultados[2], resultados[0]);
});

test("rechaza fechas inválidas", () => {
  assert.throws(() => formatearFecha("fecha-invalida"), RangeError);
});
