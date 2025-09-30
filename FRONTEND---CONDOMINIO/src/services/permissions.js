import { api } from "@/services/api";

const resource = "permissions/";

export async function listPermissions(params = {}) {
  const { data } = await api.get(resource, { params });
  return data; // {count, next, previous, results:[...]}
}

export async function createPermission(p) {
  const payload = {
    name: p.name,
    codename: p.codename,
    app_label: p.app_label,
    model: p.model,
  };
  const { data } = await api.post(resource, payload);
  return data;
}

export async function updatePermission(id, p) {
  const payload = {
    name: p.name,
    codename: p.codename,
    app_label: p.app_label,
    model: p.model,
  };
  const { data } = await api.put(`${resource}${id}/`, payload);
  return data;
}

export async function deletePermission(id) {
  await api.delete(`${resource}${id}/`);
}
