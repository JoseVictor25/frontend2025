import axios from "axios";

const API_URL = "http://localhost:8000/api"; // 👈 ajusta al dominio de Railway

export async function listAsignaciones() {
  const res = await axios.get(`${API_URL}/asignar-rol/`);
  return res.data;
}

export async function createAsignacion(data) {
  const res = await axios.post(`${API_URL}/asignar-rol/`, data);
  return res.data;
}

export async function updateAsignacion(id, data) {
  const res = await axios.put(`${API_URL}/asignar-rol/${id}/`, data);
  return res.data;
}

export async function deleteAsignacion(id) {
  const res = await axios.delete(`${API_URL}/asignar-rol/${id}/`);
  return res.data;
}
