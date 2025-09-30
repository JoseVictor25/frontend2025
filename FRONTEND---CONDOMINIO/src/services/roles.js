// src/services/roles.js
/*import { api } from "@/services/api";

const PRIMARY = "roles/";
const FALLBACK = "groups/";

async function resolveResource() {
  try {
    await api.get(PRIMARY, { params: { page: 1 } });
    return PRIMARY;
  } catch {
    return FALLBACK;
  }
}

// Normaliza name desde varios posibles nombres
const pickName = (r) => r?.name ?? r?.nombre ?? r?.role_name ?? r?.title ?? "";

// Extrae IDs de permissions sin importar el formato
export const toPermIds = (perms) =>
  (perms || [])
    .map((p) => {
      if (typeof p === "number") return p;
      if (typeof p === "string") return Number(p);
      if (p && typeof p === "object") {
        return (
          p.id ??
          p.pk ??
          p.permission_id ??
          (p.permission && (p.permission.id ?? p.permission.pk))
        );
      }
      return null;
    })
    .filter(Boolean);

// Lista (paginada) + detalle por rol para completar name/permissions
export async function listRolesDetailed(params = {}) {
  const resource = await resolveResource();

  const { data } = await api.get(resource, { params }); // {count, results} or array
  const count = Array.isArray(data) ? data.length : data.count || 0;
  const items = Array.isArray(data) ? data : (data.results || []);

  // Pide detalle de cada rol de la página actual
  const detailed = await Promise.all(
    items.map(async (row) => {
      try {
        const { data: full } = await api.get(`${resource}${row.id}/`);
        return {
          ...row,
          name: pickName(row) || pickName(full),
          permissions: full.permissions ?? row.permissions ?? [],
        };
      } catch {
        return { ...row, name: pickName(row) || "", permissions: row.permissions ?? [] };
      }
    })
  );

  return { count, results: detailed };
}

export async function createRole(payload) {
  const resource = await resolveResource();
  const body = {
    name: payload.name,
    permissions: toPermIds(payload.permissions),
  };
  const { data } = await api.post(resource, body);
  return data;
}

export async function updateRole(id, payload) {
  const resource = await resolveResource();
  const body = {
    name: payload.name,
    permissions: toPermIds(payload.permissions),
  };
  const { data } = await api.put(`${resource}${id}/`, body);
  return data;
}

export async function deleteRole(id) {
  const resource = await resolveResource();
  await api.delete(`${resource}${id}/`);
}
*/

// src/services/roles.js
import { api } from "@/services/api";

const resource = "roles/";

// 📌 Listar roles
export async function listRoles(params = {}) {
  const { data } = await api.get(resource, { params });
  return data; // { count, next, previous, results:[...] }
}

// 📌 Crear rol
export async function createRole(role) {
  const payload = {
    nombre: role.nombre,
    descripcion: role.descripcion || "",
  };
  const { data } = await api.post(resource, payload);
  return data;
}

// 📌 Actualizar rol
export async function updateRole(id, role) {
  const payload = {
    nombre: role.nombre,
    descripcion: role.descripcion || "",
  };
  const { data } = await api.put(`${resource}${id}/`, payload);
  return data;
}

// 📌 Eliminar rol
export async function deleteRole(id) {
  await api.delete(`${resource}${id}/`);
}
