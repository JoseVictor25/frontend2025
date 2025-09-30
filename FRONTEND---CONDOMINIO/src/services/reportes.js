// src/services/reportes.js
import { api } from "@/services/api";

/** Fija el endpoint si ya existe en tu API:
 *   const RESOURCE = "reportes/";
 * y usa RESOURCE en lugar de resource().
 */
const CANDIDATES = ["reportes/", "reports/", "analytics/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { ping: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/** Reporte genérico: GET /reportes/<slug>/?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&moneda=BOB */
export async function fetchReporte(slug, params = {}) {
  const { data } = await api.get(`${await resource()}${slug}/`, { params });
  return data || {};
}

/** Helpers por si tu backend no tiene reportes y debemos construirlos */
export function kpiSum(arr, sel = (x) => x) {
  return +arr.reduce((a, r) => a + Number(sel(r) || 0), 0).toFixed(2);
}
