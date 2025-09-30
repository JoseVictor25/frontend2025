// src/services/pagos.js
import { api } from "@/services/api";

/** Cambia esto por tu endpoint real si lo conoces */
const CANDIDATES = ["pagos/", "payments/", "cobros/"];

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
  factura_id: r.factura_id ?? r.invoice ?? r.invoice_id ?? r.comprobante_id ?? null,
  factura_numero: r.factura_numero ?? r.invoice_number ?? r.comprobante ?? "",
  fecha: r.fecha ?? r.date ?? r.paid_at ?? "",
  monto: Number(r.monto ?? r.amount ?? 0),
  moneda: r.moneda ?? r.currency ?? "BOB",
  metodo: r.metodo ?? r.method ?? r.forma ?? "EFECTIVO",   // EFECTIVO | TARJETA | TRANSFERENCIA | QR
  referencia: r.referencia ?? r.reference ?? r.voucher ?? "",
  estado: r.estado ?? r.status ?? "CONFIRMADO",            // CONFIRMADO | PENDIENTE | ANULADO
  observacion: r.observacion ?? r.notes ?? r.nota ?? "",
  // si tu API trae saldo de la factura
  saldo_pendiente: Number(r.saldo_pendiente ?? r.balance ?? 0),
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    factura_id: p.factura_id ?? p.invoice_id ?? p.comprobante_id ?? undefined,
    fecha: p.fecha ?? p.date ?? p.paid_at ?? undefined,
    monto: Number(p.monto ?? p.amount ?? 0),
    moneda: p.moneda ?? p.currency ?? "BOB",
    metodo: p.metodo ?? p.method ?? p.forma ?? "EFECTIVO",
    referencia: p.referencia ?? p.reference ?? p.voucher ?? "",
    estado: p.estado ?? p.status ?? "CONFIRMADO",
    observacion: p.observacion ?? p.notes ?? "",
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listPagos(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createPago(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updatePago(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deletePago(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Cambiar estado rápido (si tu API soporta PATCH) */
export async function setEstadoPago(id, estado) {
  const { data } = await api.patch(`${await resource()}${id}/`, { estado });
  return fromRow(data);
}

/** Recibo PDF (si existe)  GET /pagos/:id/pdf/ */
export async function downloadReciboPDF(id) {
  const { data } = await api.get(`${await resource()}${id}/pdf/`, { responseType: "blob" });
  return data;
}
