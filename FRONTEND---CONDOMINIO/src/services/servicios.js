// src/services/servicios.js
import { api } from "@/services/api";

/** Si ya conoces la ruta exacta, cámbiala aquí y usa RESOURCE en las llamadas. */
const CANDIDATES = ["servicios/", "services/", "mantenimiento/servicios/"];

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
  nombre: r.nombre ?? r.name ?? "",
  descripcion: r.descripcion ?? r.description ?? "",
  tipo: r.tipo ?? r.type ?? "MANTENIMIENTO", // MANTENIMIENTO | LIMPIEZA | SEGURIDAD | OTRO
  proveedor: r.proveedor ?? r.vendor ?? r.proveedor_id ?? r.vendor_id ?? "",
  costo: Number(r.costo ?? r.cost ?? r.price ?? 0),
  moneda: r.moneda ?? r.currency ?? "BOB",
  periodicidad: r.periodicidad ?? r.frequency ?? "MENSUAL", // MENSUAL | ANUAL | USO
  fecha_inicio: r.fecha_inicio ?? r.start_date ?? "",
  fecha_fin: r.fecha_fin ?? r.end_date ?? "",
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  area: r.area ?? r.area_id ?? r.amenity ?? null,
  activo: r.activo ?? r.is_active ?? r.estado ?? true,
  notas: r.notas ?? r.notes ?? "",
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    nombre: p.nombre ?? p.name ?? undefined,
    descripcion: p.descripcion ?? p.description ?? undefined,
    tipo: p.tipo ?? p.type ?? undefined,
    proveedor: p.proveedor ?? p.vendor ?? p.proveedor_id ?? p.vendor_id ?? undefined,
    costo: Number(p.costo ?? p.cost ?? p.price ?? 0),
    moneda: p.moneda ?? p.currency ?? "BOB",
    periodicidad: p.periodicidad ?? p.frequency ?? "MENSUAL",
    start_date: p.fecha_inicio ?? p.start_date ?? undefined,
    end_date: p.fecha_fin ?? p.end_date ?? undefined,
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    area: p.area ?? p.area_id ?? p.amenity ?? undefined,
    is_active: p.activo ?? p.is_active ?? undefined,
    notas: p.notas ?? p.notes ?? "",
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listServicios(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createServicio(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateServicio(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteServicio(id) {
  await api.delete(`${await resource()}${id}/`);
}
export async function setActivoServicio(id, activo = true) {
  const { data } = await api.patch(`${await resource()}${id}/`, { is_active: activo });
  return fromRow(data);
}
