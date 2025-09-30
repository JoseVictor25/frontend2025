// src/services/personal.js
import { api } from "@/services/api";

/** Ajusta al endpoint real cuando lo sepas:
 *   const RESOURCE = "personal/";
 * y usa RESOURCE en las llamadas. Mientras, intento autodetectar.
 */
const CANDIDATES = ["personal/", "staff/", "empleados/", "rrhh/personal/"];

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
  nombres: r.nombres ?? r.first_name ?? r.nombre ?? "",
  apellidos: r.apellidos ?? r.last_name ?? r.apellido ?? "",
  documento: r.documento ?? r.doc ?? r.ci ?? r.dni ?? "",
  email: r.email ?? "",
  telefono: r.telefono ?? r.phone ?? r.celular ?? "",
  direccion: r.direccion ?? r.address ?? "",
  cargo: r.cargo ?? r.position ?? r.puesto ?? "",               // string o id
  departamento: r.departamento ?? r.department ?? "",           // string o id
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,
  turno: r.turno ?? r.shift ?? "",                              // Mañana/Tarde/Noche u horario textual
  fecha_ingreso: r.fecha_ingreso ?? r.hire_date ?? r.ingreso ?? "",
  salario: Number(r.salario ?? r.salary ?? 0),
  activo: r.activo ?? r.is_active ?? r.estado ?? true,
  avatar: r.avatar ?? r.foto ?? null,
  raw: r,
});

const toPayload = (p = {}) => {
  const out = {
    first_name: p.nombres ?? p.first_name ?? undefined,
    last_name: p.apellidos ?? p.last_name ?? undefined,
    documento: p.documento ?? p.ci ?? p.dni ?? undefined,
    email: p.email ?? undefined,
    phone: p.telefono ?? p.phone ?? undefined,
    address: p.direccion ?? p.address ?? undefined,
    cargo: p.cargo ?? p.position ?? p.puesto ?? undefined,
    departamento: p.departamento ?? p.department ?? undefined,
    unidad: p.unidad ?? p.unit ?? p.unidad_id ?? p.unit_id ?? undefined,
    turno: p.turno ?? p.shift ?? undefined,
    hire_date: p.fecha_ingreso ?? p.hire_date ?? undefined,
    salario: p.salario ?? p.salary ?? undefined,
    is_active: p.activo ?? p.is_active ?? undefined,
    avatar: p.avatar ?? undefined,
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* ---------- API ---------- */
export async function listPersonal(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}
export async function createPersonal(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}
export async function updatePersonal(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}
export async function deletePersonal(id) {
  await api.delete(`${await resource()}${id}/`);
}
export async function setActivoPersonal(id, activo = true) {
  const { data } = await api.patch(`${await resource()}${id}/`, { is_active: activo });
  return fromRow(data);
}
