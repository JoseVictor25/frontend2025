// src/services/camaras.js
import { api } from "@/services/api";

/**
 * Si ya sabes el endpoint (p.ej. "camaras/"), puedes fijarlo:
 *   const RESOURCE = "camaras/";
 * y reemplazar resource() por RESOURCE en todas las llamadas.
 */
const CANDIDATES = ["camaras/", "cameras/", "security-cameras/"];

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
  nombre: r.nombre ?? r.name ?? r.alias ?? "",
  ip: r.ip ?? r.host ?? r.address ?? "",
  puerto: r.puerto ?? r.port ?? null,
  rtsp_url: r.rtsp_url ?? r.url_rtsp ?? r.stream ?? r.url ?? "",
  http_url: r.http_url ?? r.url_http ?? r.snapshot ?? r.jpg ?? "",
  ubicacion: r.ubicacion ?? r.location ?? "",
  zona: r.zona ?? r.zone ?? r.zona_id ?? r.zone_id ?? null,
  activa: r.activa ?? r.active ?? r.is_active ?? true,
  tipo: r.tipo ?? r.type ?? r.modelo ?? r.model ?? "",
  fabricante: r.fabricante ?? r.vendor ?? r.brand ?? "",
  usuario: r.usuario ?? r.username ?? "",
  // OJO: por seguridad evita mostrar contraseñas en UI
  raw: r,
});

const toPayload = (p = {}) => ({
  nombre: p.nombre ?? p.name ?? "",
  ip: p.ip ?? p.host ?? "",
  puerto: p.puerto ?? p.port ?? null,
  rtsp_url: p.rtsp_url ?? p.url_rtsp ?? p.stream ?? "",
  http_url: p.http_url ?? p.url_http ?? "",
  ubicacion: p.ubicacion ?? p.location ?? "",
  zona: p.zona ?? p.zone ?? p.zona_id ?? p.zone_id ?? null,
  activa: p.activa ?? p.active ?? true,
  tipo: p.tipo ?? p.type ?? "",
  fabricante: p.fabricante ?? p.vendor ?? p.brand ?? "",
  usuario: p.usuario ?? p.username ?? "",
  // Si tu API requiere contraseña al crear/editar, añade: password: p.password ?? ""
});

/* -------------------- API -------------------- */
export async function listCamaras(params = {}) {
  const { data } = await api.get(await resource(), { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return { count: Array.isArray(data) ? items.length : (data.count ?? items.length), results: items.map(fromRow) };
}

export async function createCamara(payload) {
  const { data } = await api.post(await resource(), toPayload(payload));
  return fromRow(data);
}

export async function updateCamara(id, payload) {
  const { data } = await api.put(`${await resource()}${id}/`, toPayload(payload));
  return fromRow(data);
}

export async function deleteCamara(id) {
  await api.delete(`${await resource()}${id}/`);
}

/** Acciones (opcionales en tu backend) */
export async function activarCamara(id, activa = true) {
  const { data } = await api.patch(`${await resource()}${id}/`, { activa });
  return fromRow(data);
}

// Si tu backend expone un test: POST camaras/:id/test/  o  GET camaras/:id/test/
export async function testCamara(id) {
  try {
    const { data } = await api.post(`${await resource()}${id}/test/`);
    return data;
  } catch {
    const { data } = await api.get(`${await resource()}${id}/test/`);
    return data;
  }
}
