// src/services/visitas.js
import { api } from "@/services/api";

/** Endpoints posibles (ordena por probabilidad en tu backend) */
const CANDIDATES = ["visitas/", "visita/", "visitas-acceso/", "visitors/", "access-visits/"];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0]; // fallback visible si no existe
  return RES_CACHE;
}

/** Mappers tolerantes */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  nombre: r.nombre ?? r.visitante ?? r.name ?? r.fullname ?? "",
  documento: r.documento ?? r.doc ?? r.dni ?? r.document ?? "",
  telefono: r.telefono ?? r.phone ?? "",
  motivo: r.motivo ?? r.reason ?? r.asunto ?? "",
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? r.unidad_uuid ?? r.unit_uuid ?? null,

  // tiempos
  fecha: r.fecha ?? r.date ?? r.created_at ?? null,
  hora_entrada: r.hora_entrada ?? r.checkin ?? r.entrada ?? r.in_time ?? r.time_in ?? null,
  hora_salida:  r.hora_salida  ?? r.checkout ?? r.salida  ?? r.out_time ?? r.time_out ?? null,

  autorizado_por: r.autorizado_por ?? r.autorizado ?? r.authorized_by ?? null,
  placa: r.placa ?? r.plate ?? r.vehiculo ?? "",
  estado: r.estado ?? r.status ?? (r.hora_entrada && !r.hora_salida ? "EN_CASA" : r.hora_salida ? "SALIO" : "PENDIENTE"),
  raw: r,
});

const toPayload = (p = {}) => ({
  nombre: p.nombre ?? p.visitante ?? p.name ?? "",
  documento: p.documento ?? p.dni ?? p.document ?? "",
  telefono: p.telefono ?? p.phone ?? "",
  motivo: p.motivo ?? p.reason ?? "",
  unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? p.unidad_uuid ?? p.unit_uuid ?? null,

  fecha: p.fecha ?? null,
  hora_entrada: p.hora_entrada ?? p.checkin ?? null,
  hora_salida:  p.hora_salida  ?? p.checkout ?? null,

  autorizado_por: p.autorizado_por ?? p.authorized_by ?? null,
  placa: p.placa ?? p.plate ?? p.vehiculo ?? "",
  estado: p.estado ?? p.status ?? undefined,
});

/** Listado (paginado) */
export async function listVisitas(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}

/** Crear / Actualizar / Eliminar */
export async function createVisita(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updateVisita(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deleteVisita(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Acciones rápidas: marcar entrada / salida (PATCH) */
export async function checkInVisita(id, isoDateTime) {
  const { data } = await api.patch(`${await resource()}${id}/`, { hora_entrada: isoDateTime });
  return fromRow(data);
}
export async function checkOutVisita(id, isoDateTime) {
  const { data } = await api.patch(`${await resource()}${id}/`, { hora_salida: isoDateTime });
  return fromRow(data);
}
