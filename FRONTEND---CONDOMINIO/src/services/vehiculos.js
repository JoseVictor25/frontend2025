
import { api } from "./api";

const resource = "vehiculos/";

export async function listVehiculos(params = {}) {
  const { data } = await api.get(resource, { params });
  return data;
}

export async function createVehiculo(payload) {
  const { data } = await api.post(resource, payload);
  return data;
}

export async function updateVehiculo(id, payload) {
  const { data } = await api.put(`${resource}${id}/`, payload);
  return data;
}

export async function deleteVehiculo(id) {
  await api.delete(`${resource}${id}/`);
}
