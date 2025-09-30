import { api } from "@/services/api";

// Ajusta si tu backend usa otra ruta (ej. "etiquetas/")
const RESOURCE = "tang/";

/* Backend -> UI */
const toUI = (r = {}) => ({
  id: r.id ?? r.uuid ?? r.pk,
  nombre: r.nombre ?? r.name,
  slug: r.slug,
  color: r.color,               // hex (#RRGGBB)
  descripcion: r.descripcion ?? r.description ?? "",
  activo: typeof r.activo === "boolean" ? r.activo : (r.is_active ?? true),
  created_at: r.created_at,
  updated_at: r.updated_at,
});

/* UI -> Backend */
const toBackend = (p = {}) => {
  const out = {
    nombre: p.nombre ?? p.name,
    slug: p.slug,
    color: p.color,
    descripcion: p.descripcion ?? p.description,
    activo: typeof p.activo === "boolean" ? p.activo : undefined,
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

export async function listTags(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) clean[k] = v;
  });
  const { data } = await api.get(RESOURCE, { params: clean });
  const items = Array.isArray(data) ? data : (data.results || []);
  const count = Array.isArray(data) ? items.length : (data.count ?? items.length);
  return { count, results: items.map(toUI) };
}

export async function createTag(payload) {
  const { data } = await api.post(RESOURCE, toBackend(payload));
  return toUI(data);
}

// PATCH parcial
export async function updateTag(id, payload) {
  const { data } = await api.patch(`${RESOURCE}${id}/`, toBackend(payload));
  return toUI(data);
}

export async function deleteTag(id) {
  await api.delete(`${RESOURCE}${id}/`);
}

export async function toggleActivo(id, activo = true) {
  const { data } = await api.patch(`${RESOURCE}${id}/`, { activo });
  return toUI(data);
}
