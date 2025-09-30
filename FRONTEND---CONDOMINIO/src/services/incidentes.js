// src/services/incidentes.js
import { api } from "@/services/api";

/**
 * Si ya sabes el endpoint exacto (p.ej. "incidentes/"), fíjalo:
 *   const RESOURCE = "incidentes/";
 * y reemplaza resource() por RESOURCE en las llamadas.
 */
const CANDIDATES = ["incidentes/", "incidents/", "reportes-incidentes/", "issues/"];

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
  titulo: r.titulo ?? r.title ?? r.asunto ?? "",
  descripcion: r.descripcion ?? r.description ?? r.detalle ?? "",
  categoria: r.categoria ?? r.category ?? r.tipo ?? r.type ?? "",
  prioridad: r.prioridad ?? r.priority ?? r.severity ?? "",
  estado: r.estado ?? r.status ?? "ABIERTO", // ABIERTO | EN_PROGRESO | RESUELTO | CERRADO
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? r.unidad_uuid ?? r.unit_uuid ?? null,
  reportado_por: r.reportado_por ?? r.reporter ?? r.creado_por ?? r.created_by ?? null,
  asignado_a: r.asignado_a ?? r.assignee ?? r.encargado ?? null,

  fecha_reporte: r.fecha_reporte ?? r.fecha ?? r.created_at ?? r.reported_at ?? null,
  fecha_resolucion: r.fecha_resolucion ?? r.resuelto_en ?? r.resolved_at ?? null,

  evidencia_url: r.evidencia_url ?? r.evidence ?? r.photo ?? r.image ?? r.attachment ?? "",
  notas: r.notas ?? r.comentarios ?? r.comments ?? "",

  raw: r,
});

const toPayload = (p = {}) => ({
  titulo: p.titulo ?? p.title ?? "",
  descripcion: p.descripcion ?? p.description ?? "",
  categoria: p.categoria ?? p.category ?? p.tipo ?? p.type ?? "",
  prioridad: p.prioridad ?? p.priority ?? p.severity ?? "",
  estado: p.estado ?? p.status ?? undefined,
  unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? p.unidad_uuid ?? p.unit_uuid ?? null,
  reportado_por: p.reportado_por ?? p.reporter ?? null,
  asignado_a: p.asignado_a ?? p.assignee ?? null,
  fecha_reporte: p.fecha_reporte ?? p.fecha ?? null,
  fecha_resolucion: p.fecha_resolucion ?? p.resuelto_en ?? null,
  evidencia_url: p.evidencia_url ?? p.evidence ?? p.photo ?? "",
  notas: p.notas ?? p.comments ?? "",
});

/* -------------------- API -------------------- */
export async function listIncidentes(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createIncidente(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateIncidente(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteIncidente(id) {
  await api.delete(`${await resource()}${id}/`);
}

/* ---- Acciones rápidas: cambio de estado (PATCH) ---- */
export async function setEstadoIncidente(id, estado, extra = {}) {
  const { data } = await api.patch(`${await resource()}${id}/`, { estado, ...extra });
  return fromRow(data);
}
