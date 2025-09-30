// src/services/tareas_mantenimiento.js
import { api } from "@/services/api";

/** Cuando confirmes tu endpoint, fija así:
 *   const RESOURCE = "tareas-mantenimiento/";
 * y usa RESOURCE en las llamadas. Mientras, autodetecto: */
const CANDIDATES = [
  "tareas-mantenimiento/",
  "mantenimiento/tareas/",
  "work-orders/tasks/",
  "tasks/",
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

/* ---------- Mappers tolerantes ---------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  codigo: r.codigo ?? r.code ?? r.numero ?? "",
  titulo: r.titulo ?? r.title ?? "",
  descripcion: r.descripcion ?? r.description ?? "",
  estado: r.estado ?? r.status ?? "PENDIENTE",        // PENDIENTE | EN_PROCESO | COMPLETADA | CANCELADA
  prioridad: r.prioridad ?? r.priority ?? "MEDIA",    // BAJA | MEDIA | ALTA | CRITICA
  responsable: r.responsable ?? r.assignee ?? r.user ?? r.responsable_id ?? null,
  servicio: r.servicio ?? r.service ?? r.servicio_id ?? r.service_id ?? null,
  equipo: r.equipo ?? r.asset ?? r.equipo_id ?? r.asset_id ?? null,
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  area: r.area ?? r.area_id ?? r.amenity ?? null,
  fecha_programada: r.fecha_programada ?? r.scheduled_date ?? r.start_date ?? "",
  fecha_limite: r.fecha_limite ?? r.due_date ?? r.end_date ?? "",
  fecha_inicio: r.fecha_inicio ?? r.started_at ?? "",
  fecha_cierre: r.fecha_cierre ?? r.completed_at ?? "",
  recurrencia: r.recurrencia ?? r.recurrence ?? "NUNCA", // NUNCA | DIARIA | SEMANAL | MENSUAL
  estimado_horas: Number(r.estimado_horas ?? r.estimated_hours ?? 0),
  costo_estimado: Number(r.costo_estimado ?? r.estimated_cost ?? 0),
  notas: r.notas ?? r.notes ?? "",
  activo: r.activo ?? r.is_active ?? true,
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    codigo: p.codigo ?? p.code ?? undefined,
    titulo: p.titulo ?? p.title ?? undefined,
    descripcion: p.descripcion ?? p.description ?? undefined,
    status: p.estado ?? p.status ?? undefined,
    priority: p.prioridad ?? p.priority ?? undefined,
    responsable: p.responsable ?? p.assignee ?? p.user ?? p.responsable_id ?? undefined,
    servicio: p.servicio ?? p.service ?? p.servicio_id ?? p.service_id ?? undefined,
    equipo: p.equipo ?? p.asset ?? p.equipo_id ?? p.asset_id ?? undefined,
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    area: p.area ?? p.area_id ?? p.amenity ?? undefined,
    scheduled_date: p.fecha_programada ?? p.scheduled_date ?? p.start_date ?? undefined,
    due_date: p.fecha_limite ?? p.due_date ?? p.end_date ?? undefined,
    started_at: p.fecha_inicio ?? p.started_at ?? undefined,
    completed_at: p.fecha_cierre ?? p.completed_at ?? undefined,
    recurrence: p.recurrencia ?? p.recurrence ?? "NUNCA",
    estimated_hours: p.estimado_horas ?? p.estimated_hours ?? undefined,
    estimated_cost: p.costo_estimado ?? p.estimated_cost ?? undefined,
    is_active: p.activo ?? p.is_active ?? undefined,
    notes: p.notas ?? p.notes ?? "",
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listTareas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createTarea(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateTarea(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteTarea(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Acciones rápidas (si tu backend soporta PATCH) */
export async function setEstadoTarea(id, estado) {
  const { data } = await api.patch(`${await resource()}${id}/`, { status: estado });
  return fromRow(data);
}
export async function startTarea(id) {
  const { data } = await api.post(`${await resource()}${id}/start/`).catch(async () =>
    (await api.patch(`${await resource()}${id}/`, { status: "EN_PROCESO", started_at: new Date().toISOString() })).data
  );
  return fromRow(data);
}
export async function completeTarea(id) {
  const { data } = await api.post(`${await resource()}${id}/complete/`).catch(async () =>
    (await api.patch(`${await resource()}${id}/`, { status: "COMPLETADA", completed_at: new Date().toISOString() })).data
  );
  return fromRow(data);
}
export async function cancelTarea(id) {
  const { data } = await api.post(`${await resource()}${id}/cancel/`).catch(async () =>
    (await api.patch(`${await resource()}${id}/`, { status: "CANCELADA" })).data
  );
  return fromRow(data);
}
