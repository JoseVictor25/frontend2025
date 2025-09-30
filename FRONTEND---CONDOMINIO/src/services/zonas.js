// src/services/zonas.js
import { api } from "@/services/api";

/**
 * Si ya sabes el endpoint (p.ej. "zonas/"), puedes fijarlo:
 *   const RESOURCE = "zonas/";
 * y reemplazar resource() por RESOURCE en todas las llamadas.
 */
const CANDIDATES = ["zonas/", "zona/", "areas-comunes/", "areas/", "zones/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* -------------------- Mappers tolerantes -------------------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  nombre: r.nombre ?? r.name ?? r.titulo ?? "",
  descripcion: r.descripcion ?? r.description ?? r.detalle ?? "",
  tipo: r.tipo ?? r.type ?? r.categoria ?? "",
  aforo: r.aforo ?? r.capacity ?? r.cupo ?? null,
  activo: r.activo ?? r.is_active ?? r.status ?? true,
  // ubicación opcional
  ubicacion: r.ubicacion ?? r.location ?? r.bloque ?? r.torre ?? r.edificio ?? "",
  // horario opcional (HH:mm)
  horario_inicio: r.horario_inicio ?? r.hora_inicio ?? r.open_from ?? r.start_time ?? null,
  horario_fin:    r.horario_fin    ?? r.hora_fin    ?? r.open_to   ?? r.end_time   ?? null,
  color: r.color ?? r.hex ?? null,
  raw: r,
});

const toPayload = (p = {}) => ({
  nombre: p.nombre ?? p.name ?? "",
  descripcion: p.descripcion ?? p.description ?? "",
  tipo: p.tipo ?? p.type ?? p.categoria ?? "",
  aforo: p.aforo ?? p.capacity ?? p.cupo ?? null,
  activo: p.activo ?? p.is_active ?? true,
  ubicacion: p.ubicacion ?? p.location ?? p.bloque ?? p.torre ?? null,
  horario_inicio: p.horario_inicio ?? p.hora_inicio ?? p.open_from ?? null,
  horario_fin:    p.horario_fin    ?? p.hora_fin    ?? p.open_to   ?? null,
  color: p.color ?? null,
});

/* -------------------- API -------------------- */
export async function listZonas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}

export async function createZona(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}

export async function updateZona(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}

export async function deleteZona(id) {
  await api.delete(`${await resource()}${id}/`);
}
