// src/services/areas_comunes.js
import { api } from "@/services/api";

/** Si conoces el endpoint exacto (p.ej. "areas-comunes/"), fíjalo:
 *   const RESOURCE = "areas-comunes/";
 * y reemplaza resource() por RESOURCE.
 */
const CANDIDATES = ["areas-comunes/", "areas/", "amenities/", "common-areas/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* --------- mappers tolerantes --------- */
// src/services/areas_comunes.js

const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  nombre: r.nombre ?? r.name ?? "",
  descripcion: r.descripcion ?? r.description ?? "",
  // tipo puede venir como 'type' o 'category' o 'categoria'
  tipo: r.tipo ?? r.type ?? r.category ?? r.categoria ?? "",
  ubicacion: r.ubicacion ?? r.location ?? "",
  aforo: r.aforo ?? r.capacity ?? null,
  activo: r.activo ?? r.is_active ?? r.status ?? true,
  requiere_reserva: r.requiere_reserva ?? r.requires_booking ?? r.bookable ?? false,
  // costo puede venir como 'precio', 'tarifa', 'fee', 'rate'
  costo: r.costo ?? r.precio ?? r.tarifa ?? r.fee ?? r.price ?? r.rate ?? null,
  // horario puede venir como 'hora_inicio/fin', 'start_time/end_time', 'open_from/to'
  horario_inicio: r.horario_inicio ?? r.hora_inicio ?? r.start_time ?? r.open_from ?? null,
  horario_fin:    r.horario_fin    ?? r.hora_fin    ?? r.end_time   ?? r.open_to   ?? null,
  reglas: r.reglas ?? r.rules ?? r.politicas ?? r.policies ?? "",
  color: r.color ?? null,
  raw: r,
});

const toPayload = (p = {}) => ({
  nombre: p.nombre ?? p.name ?? "",
  descripcion: p.descripcion ?? p.description ?? "",
  // aceptar 'type' o 'category' desde el form (por si lo usas)
  tipo: p.tipo ?? p.type ?? p.category ?? p.categoria ?? "",
  ubicacion: p.ubicacion ?? p.location ?? "",
  aforo: p.aforo ?? p.capacity ?? null,
  activo: p.activo ?? p.is_active ?? true,
  requiere_reserva: p.requiere_reserva ?? p.requires_booking ?? p.bookable ?? false,
  // mandar costo con cualquiera de estos nombres (el backend ignorará los extras)
  costo: p.costo ?? p.precio ?? p.tarifa ?? p.fee ?? p.price ?? p.rate ?? null,
  horario_inicio: p.horario_inicio ?? p.hora_inicio ?? p.start_time ?? p.open_from ?? null,
  horario_fin:    p.horario_fin    ?? p.hora_fin    ?? p.end_time   ?? p.open_to   ?? null,
  reglas: p.reglas ?? p.rules ?? p.politicas ?? "",
  color: p.color ?? null,
});


/* --------- API --------- */
export async function listAreas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createArea(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateArea(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteArea(id) {
  await api.delete(`${await resource()}${id}/`);
}
