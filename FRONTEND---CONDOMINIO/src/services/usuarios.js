import { api } from "@/services/api";

const RESOURCE = "users/";   
       // ajusta si tu endpoint difiere
const ROLES_RESOURCE = "roles/";       // para llenar selects (opcional)

/** Backend -> UI */
const toUI = (r = {}) => ({
  id: r.id ?? r.uuid ?? r.pk,
  username: r.username,
  email: r.email,
  nombres: r.nombres ?? r.first_name ?? "",
  apellidos: r.apellidos ?? r.last_name ?? "",
  telefono: r.telefono ?? r.phone ?? "",
  activo: typeof r.is_active === "boolean" ? r.is_active : (r.activo ?? true),
  rol_id: r.rol_id ?? r.role_id ?? (Array.isArray(r.roles) ? r.roles[0]?.id : r.role?.id),
  rol_nombre: r.rol_nombre ?? r.role_name ?? r.role?.name ?? (Array.isArray(r.roles) ? r.roles[0]?.name : undefined),
  created_at: r.created_at,
  updated_at: r.updated_at,
  bio: r.bio,
});

/** UI -> Backend */
const toBackend = (p = {}) => {
  const out = {
    username: p.username,
    email: p.email,
    first_name: p.nombres ?? p.first_name,
    last_name: p.apellidos ?? p.last_name,
    phone: p.telefono ?? p.phone,
    is_active: typeof p.activo === "boolean" ? p.activo : undefined,
    password: p.password,
    password2: p.password2,
    bio: p.bio,
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

export async function listUsuarios(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) clean[k] = v;
  });
  const { data } = await api.get(RESOURCE, { params: clean });
  const items = Array.isArray(data) ? data : (data.results || []);
  const count = Array.isArray(data) ? items.length : (data.count ?? items.length);
  return { count, results: items.map(toUI) };
}

export async function createUsuario(payload) {
  const { data } = await api.post(RESOURCE, toBackend(payload));
  return toUI(data);
}

// PATCH para parches parciales
export async function updateUsuario(id, payload) {
  const { data } = await api.patch(`${RESOURCE}${id}/`, toBackend(payload));
  return toUI(data);
}

export async function deleteUsuario(id) {
  await api.delete(`${RESOURCE}${id}/`);
}

export async function toggleActivo(id, activo = true) {
  const { data } = await api.patch(`${RESOURCE}${id}/`, { is_active: activo });
  return toUI(data);
}

export async function resetPassword(id) {
  // intenta primero /reset_password/, si no existe usa /reset-password/
  try {
    const { data } = await api.post(`${RESOURCE}${id}/reset_password/`);
    return data;
  } catch {
    const { data } = await api.post(`${RESOURCE}${id}/reset-password/`);
    return data;
  }
}

export async function assignRol(id, rolId) {
  // adapta al endpoint real de tu API
  try {
    const { data } = await api.post(`${RESOURCE}${id}/assign_role/`, { role_id: rolId });
    return data;
  } catch {
    const { data } = await api.post(`${RESOURCE}${id}/rol/`, { rol_id: rolId });
    return data;
  }
}

/* Utilitario para llenar selects de rol */
export async function listRoles(params = {}) {
  const { data } = await api.get(ROLES_RESOURCE, { params });
  const items = Array.isArray(data) ? data : (data.results || []);
  return items.map(r => ({
    id: r.id ?? r.uuid ?? r.pk,
    nombre: r.nombre ?? r.name ?? r.code ?? `Rol ${r.id}`,
  }));
}
