// src/services/bitacora.js
import { api } from "@/services/api";

/** Cuando confirmes la ruta exacta, fíjala:
 *   const RESOURCE = "bitacora/";
 * y úsala en lugar de resource(). Mientras, autodetecto: */
const CANDIDATES = [
  "bitacora/",
  "bitacoras/",
  "operaciones/bitacora/",
  "mantenimiento/bitacora/",
  "logs/",
];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* -------- Mappers tolerantes -------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  fecha: r.fecha ?? r.date ?? (r.created_at || "").slice(0,10) ?? "",
  hora: r.hora ?? r.time ?? (r.created_at || "").slice(11,16) ?? "",
  turno: r.turno ?? r.shift ?? "",
  tipo: r.tipo ?? r.category ?? r.class ?? "OPERATIVO", // OPERATIVO | SEGURIDAD | LIMPIEZA | MANTENIMIENTO | INCIDENTE
  titulo: r.titulo ?? r.title ?? "",
  descripcion: r.descripcion ?? r.description ?? r.detalle ?? "",
  autor: r.autor ?? r.author ?? r.user ?? r.personal ?? r.autor_id ?? null,
  estado: r.estado ?? r.status ?? "ABIERTO", // ABIERTO | CERRADO
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  area: r.area ?? r.area_id ?? r.amenity ?? null,
  tarea_id: r.tarea_id ?? r.task_id ?? r.tarea ?? null,
  incidente_id: r.incidente_id ?? r.incident_id ?? r.incidente ?? null,
  adjunto_url: r.adjunto_url ?? r.attachment ?? r.file ?? "",
  notas: r.notas ?? r.notes ?? "",
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    fecha: p.fecha ?? p.date ?? undefined,
    hora: p.hora ?? p.time ?? undefined,
    turno: p.turno ?? p.shift ?? undefined,
    tipo: p.tipo ?? p.category ?? undefined,
    title: p.titulo ?? p.title ?? undefined,
    descripcion: p.descripcion ?? p.description ?? p.detalle ?? undefined,
    autor: p.autor ?? p.author ?? p.user ?? p.personal ?? p.autor_id ?? undefined,
    status: p.estado ?? p.status ?? undefined,
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    area: p.area ?? p.area_id ?? p.amenity ?? undefined,
    tarea_id: p.tarea_id ?? p.task_id ?? undefined,
    incidente_id: p.incidente_id ?? p.incident_id ?? undefined,
    adjunto_url: p.adjunto_url ?? p.attachment ?? "",
    notas: p.notas ?? p.notes ?? "",
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* -------- API -------- */
export async function listBitacora(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createBitacora(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateBitacora(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteBitacora(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Acciones rápidas (si tu API soporta PATCH) */
export async function setEstadoBitacora(id, estado) {
  const { data } = await api.patch(`${await resource()}${id}/`, { status: estado });
  return fromRow(data);
}
