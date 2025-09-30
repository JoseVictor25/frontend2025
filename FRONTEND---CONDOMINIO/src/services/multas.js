// src/services/multas.js
import { api } from "@/services/api";

/** Ajusta al endpoint real, p.ej. "multas/" o "fines/" */
const CANDIDATES = ["multas/", "fines/", "sanciones/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* ---------- Mappers tolerantes ---------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  codigo: r.codigo ?? r.code ?? r.numero ?? "",
  motivo: r.motivo ?? r.reason ?? r.descripcion ?? r.description ?? "",
  tipo: r.tipo ?? r.type ?? "GENERAL",
  monto: Number(r.monto ?? r.amount ?? 0),
  moneda: r.moneda ?? r.currency ?? "BOB",
  estado: r.estado ?? r.status ?? "PENDIENTE", // PENDIENTE | PAGADA | ANULADA
  fecha: r.fecha ?? r.date ?? r.created_at ?? "",
  vencimiento: r.vencimiento ?? r.due_date ?? "",
  interes_dia: Number(r.interes_dia ?? r.daily_interest ?? 0),
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  residente: r.residente ?? r.resident ?? r.residente_id ?? r.resident_id ?? null,
  factura_id: r.factura_id ?? r.invoice_id ?? null,
  factura_numero: r.factura_numero ?? r.invoice_number ?? "",
  observacion: r.observacion ?? r.notes ?? "",
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    codigo: p.codigo ?? p.code ?? undefined,
    motivo: p.motivo ?? p.reason ?? p.descripcion ?? undefined,
    tipo: p.tipo ?? p.type ?? undefined,
    monto: Number(p.monto ?? p.amount ?? 0),
    moneda: p.moneda ?? p.currency ?? "BOB",
    estado: p.estado ?? p.status ?? "PENDIENTE",
    fecha: p.fecha ?? p.date ?? undefined,
    vencimiento: p.vencimiento ?? p.due_date ?? undefined,
    interes_dia: Number(p.interes_dia ?? p.daily_interest ?? 0),
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    residente: p.residente ?? p.resident ?? p.residente_id ?? p.resident_id ?? undefined,
    observacion: p.observacion ?? p.notes ?? "",
    factura_id: p.factura_id ?? p.invoice_id ?? undefined, // si enlazas con factura
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listMultas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createMulta(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateMulta(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteMulta(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Cambiar estado rápido (si tu API soporta PATCH) */
export async function setEstadoMulta(id, estado) {
  const { data } = await api.patch(`${await resource()}${id}/`, { estado });
  return fromRow(data);
}

/** Generar factura desde multa (si tu backend lo tiene)
 * POST /multas/:id/generar-factura/
 */
export async function generarFacturaDeMulta(id) {
  const { data } = await api.post(`${await resource()}${id}/generar-factura/`);
  return data; // debería devolver factura_id/numero
}
