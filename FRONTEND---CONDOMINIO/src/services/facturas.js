// src/services/facturas.js
import { api } from "@/services/api";

/** Ajusta el RESOURCE a tu endpoint real, p.ej. "facturas/" o "invoices/" */
const CANDIDATES = ["facturas/", "invoices/", "comprobantes/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* ---------- mappers tolerantes ---------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  numero: r.numero ?? r.code ?? r.serial ?? "",
  cliente_id: r.cliente_id ?? r.customer_id ?? r.persona_id ?? null,
  cliente_nombre: r.cliente_nombre ?? r.customer_name ?? r.persona ?? "",
  cliente_tipo: r.cliente_tipo ?? r.customer_type ?? r.tipo ?? "RESIDENTE",
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  fecha_emision: r.fecha_emision ?? r.issue_date ?? r.fecha ?? "",
  fecha_vencimiento: r.fecha_vencimiento ?? r.due_date ?? "",
  estado: r.estado ?? r.status ?? "PENDIENTE",
  moneda: r.moneda ?? r.currency ?? "BOB",

  items: (r.items || r.detalle || []).map((it) => ({
    descripcion: it.descripcion ?? it.description ?? "",
    cantidad: Number(it.cantidad ?? it.qty ?? 1),
    precio: Number(it.precio ?? it.unit_price ?? 0),
    total: Number(it.total ?? it.subtotal ?? (Number(it.cantidad ?? 1) * Number(it.precio ?? 0))),
  })),

  subtotal: Number(r.subtotal ?? r.amount_subtotal ?? 0),
  impuesto: Number(r.impuesto ?? r.tax ?? r.iva ?? 0),
  descuento: Number(r.descuento ?? r.discount ?? 0),
  total: Number(r.total ?? r.amount_total ?? 0),

  notas: r.notas ?? r.notes ?? "",
  raw: r,
});

const toPayload = (p = {}) => ({
  numero: p.numero ?? p.code ?? undefined,
  cliente_id: p.cliente_id ?? p.customer_id ?? undefined,
  cliente_tipo: p.cliente_tipo ?? p.customer_type ?? "RESIDENTE",
  cliente_nombre: p.cliente_nombre ?? p.customer_name ?? undefined,
  unidad: p.unidad ?? p.unit ?? undefined,
  fecha_emision: p.fecha_emision ?? p.issue_date ?? undefined,
  fecha_vencimiento: p.fecha_vencimiento ?? p.due_date ?? undefined,
  estado: p.estado ?? p.status ?? undefined,
  moneda: p.moneda ?? p.currency ?? "BOB",
  items: (p.items || []).map((it) => ({
    descripcion: it.descripcion ?? it.description ?? "",
    cantidad: Number(it.cantidad ?? it.qty ?? 1),
    precio: Number(it.precio ?? it.unit_price ?? 0),
    total: Number(it.total ?? (Number(it.cantidad ?? 1) * Number(it.precio ?? 0))),
  })),
  subtotal: Number(p.subtotal ?? 0),
  impuesto: Number(p.impuesto ?? 0),
  descuento: Number(p.descuento ?? 0),
  total: Number(p.total ?? 0),
  notas: p.notas ?? p.notes ?? "",
});

/* ---------- API ---------- */
export async function listFacturas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}

export async function createFactura(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}

export async function updateFactura(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}

export async function deleteFactura(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Descargar PDF (si tu backend lo implementa):
 * GET /facturas/:id/pdf/  o  /invoices/:id/pdf/
 */
export async function downloadFacturaPDF(id) {
  try {
    const { data } = await api.get(`${await resource()}${id}/pdf/`, { responseType: "blob" });
    return data; // blob
  } catch {
    const { data } = await api.get(`${await resource()}${id}/print/`, { responseType: "blob" });
    return data;
  }
}
