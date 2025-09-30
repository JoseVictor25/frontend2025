// src/services/unidades.js
import { api } from "./api";

// Listar unidades
export async function listUnidades(params = {}) {
  const { data } = await api.get("unidades/", { params });
  return data;
}

// Crear unidad
export async function createUnidad(payload) {
  const { data } = await api.post("unidades/", payload);
  return data;
}

// Actualizar unidad
export async function updateUnidad(id, payload) {
  const { data } = await api.put(`unidades/${id}/`, payload);
  return data;
}

// Eliminar unidad
export async function deleteUnidad(id) {
  return api.delete(`unidades/${id}/`);
}
