// src/services/reparaciones.js
import { api } from "@/services/api";

/** Si sabes el endpoint exacto, fíjalo:
 *   const RESOURCE = "reparaciones/";
 * y reemplaza resource() por RESOURCE en las llamadas.
 */
const CANDIDATES = ["reparaciones/", "repairs/", "ordenes-reparacion/", "work-orders/"];

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
  codigo: r.codigo ?? r.code ?? r.numero ?? r.wo ?? "",
  titulo: r.titulo ?? r.title ?? "",
  descripcion: r.descripcion ?? r.description ?? "",
  categoria: r.categoria ?? r.category ?? "",
  estado: r.estado ?? r.status ?? "PENDIENTE", // PENDIENTE | EN_PROCESO | COMPLETADO | ANULADO
  proveedor: r.proveedor ?? r.vendor ?? r.proveedor_id ?? r.vendor_id ?? "",
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  area: r.area ?? r.area_id ?? r.amenity ?? null,
  incidente: r.incidente ?? r.incidente_id ?? r.incident ?? null,
  fecha: r.fecha ?? r.date ?? r.created_at ?? "",
  fecha_cierre: r.fecha_cierre ?? r.closed_at ?? "",

  costo_materiales: Number(r.costo_materiales ?? r.materials ?? 0),
  costo_mano_obra: Number(r.costo_mano_obra ?? r.labor ?? 0),
  costo_otros: Number(r.costo_otros ?? r.others ?? 0),
  impuesto: Number(r.impuesto ?? r.tax ?? 0), // monto, no %
  total: Number(r.total ?? r.amount_total ?? 0),

  moneda: r.moneda ?? r.currency ?? "BOB",
  adjunto_url: r.adjunto_url ?? r.attachment ?? r.file ?? "",
  notas: r.notas ?? r.notes ?? "",

  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    codigo: p.codigo ?? p.code ?? undefined,
    titulo: p.titulo ?? p.title ?? undefined,
    descripcion: p.descripcion ?? p.description ?? undefined,
    categoria: p.categoria ?? p.category ?? undefined,
    estado: p.estado ?? p.status ?? undefined,
    proveedor: p.proveedor ?? p.vendor ?? p.proveedor_id ?? p.vendor_id ?? undefined,
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    area: p.area ?? p.area_id ?? p.amenity ?? undefined,
    incidente: p.incidente ?? p.incident ?? p.incidente_id ?? undefined,
    fecha: p.fecha ?? p.date ?? undefined,
    fecha_cierre: p.fecha_cierre ?? p.closed_at ?? undefined,

    costo_materiales: Number(p.costo_materiales ?? p.materials ?? 0),
    costo_mano_obra: Number(p.costo_mano_obra ?? p.labor ?? 0),
    costo_otros: Number(p.costo_otros ?? p.others ?? 0),
    impuesto: Number(p.impuesto ?? p.tax ?? 0),
    total: Number(p.total ?? 0),

    moneda: p.moneda ?? p.currency ?? "BOB",
    adjunto_url: p.adjunto_url ?? p.attachment ?? "",
    notas: p.notas ?? p.notes ?? "",
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listReparaciones(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createReparacion(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateReparacion(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteReparacion(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Cambiar estado rápido (si tu API lo soporta) */
export async function setEstadoReparacion(id, estado) {
  const { data } = await api.patch(`${await resource()}${id}/`, { estado });
  return fromRow(data);
}
