// src/services/inquilinos.js
import { api } from "@/services/api";

// Soporta varios endpoints
const CANDIDATES = ["inquilinos/", "tenants/"];

async function resource() {
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); return p; } catch {}
  }
  return CANDIDATES[0];
}

// Normaliza fila proveniente del backend
const fromRow = (r = {}) => ({
  id:        r.id ?? r.pk,
  nombre:    r.nombre ?? r.first_name ?? r.nombres ?? "",
  apellido:  r.apellido ?? r.last_name ?? r.apellidos ?? "",
  dni:       r.dni ?? r.document ?? r.identidad ?? r.ci ?? "",
  telefono:  r.telefono ?? r.phone ?? "",
  email:     r.email ?? "",
  unidad:    r.unidad ?? r.unit ?? r.unidad_id ?? r.unidad_uuid ?? r.unit_id ?? r.unit_uuid ?? null,
  activo:    r.activo ?? r.is_active ?? true,
  // Fechas contrato (opcionales)
  fecha_inicio: r.fecha_inicio ?? r.start_date ?? r.fecha_alta ?? null,
  fecha_fin:    r.fecha_fin ?? r.end_date ?? r.fecha_baja ?? null,
  raw: r,
});

// Arma el payload que tu API acepta (nombres habituales)
const toPayload = (p = {}) => ({
  nombre:  p.nombre  ?? p.first_name ?? p.nombres ?? "",
  apellido:p.apellido?? p.last_name  ?? p.apellidos ?? "",
  dni:     p.dni     ?? p.document   ?? p.identidad ?? p.ci ?? "",
  telefono:p.telefono?? p.phone      ?? "",
  email:   p.email   ?? "",
  unidad:  p.unidad  ?? p.unidad_id  ?? p.unidad_uuid ?? p.unit ?? p.unit_id ?? p.unit_uuid ?? null,
  activo:  p.activo  ?? p.is_active  ?? true,
  fecha_inicio: p.fecha_inicio ?? p.start_date ?? null,
  fecha_fin:    p.fecha_fin    ?? p.end_date   ?? null,
});

export async function listInquilinos(params = {}) {
  const res = await api.get(await resource(), { params });
  const data = res.data;
  const items = Array.isArray(data) ? data : (data.results || []);
  return {
    count: Array.isArray(data) ? items.length : (data.count ?? items.length),
    results: items.map(fromRow),
  };
}

export async function createInquilino(payload) {
  const res = await api.post(await resource(), toPayload(payload));
  return fromRow(res.data);
}

export async function updateInquilino(id, payload) {
  const res = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(res.data);
}

export async function deleteInquilino(id) {
  await api.delete(`${await resource()}${id}/`);
}
