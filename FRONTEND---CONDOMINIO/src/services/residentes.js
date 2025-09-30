import { api } from "@/services/api";

const RESOURCE = "familia/"; // <- tu endpoint real

const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  nombre: r.nombre ?? r.first_name ?? r.nombres ?? "",
  apellido: r.apellido ?? r.last_name ?? r.apellidos ?? "",
  dni: r.dni ?? r.documento ?? r.document ?? r.identidad ?? r.ci ?? "",
  telefono: r.telefono ?? r.phone ?? "",
  email: r.email ?? "",
  parentesco: r.parentesco ?? r.relationship ?? r.relacion ?? "",
  fecha_nac: r.fecha_nac ?? r.fecha_nacimiento ?? r.birth_date ?? null,
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unidad_uuid ?? r.unit_id ?? r.unit_uuid ?? null,
  activo: r.activo ?? r.is_active ?? true,
  raw: r,
});

const toPayload = (p = {}) => ({
  nombre: p.nombre ?? "",
  apellido: p.apellido ?? "",
  dni: p.dni ?? "",
  telefono: p.telefono ?? "",
  email: p.email ?? "",
  parentesco: p.parentesco ?? "",
  fecha_nac: p.fecha_nac ?? null,
  unidad: p.unidad ?? null,
  activo: p.activo ?? true,
});

export async function listResidentes(params = {}) {
  const { data } = await api.get(RESOURCE, { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createResidente(payload) {
  const { data } = await api.post(RESOURCE, toPayload(payload)); return fromRow(data);
}
export async function updateResidente(id, payload) {
  const { data } = await api.put(`${RESOURCE}${id}/`, toPayload(payload)); return fromRow(data);
}
export async function deleteResidente(id) { await api.delete(`${RESOURCE}${id}/`); }
