// src/services/reconocimiento.js
import axios from "axios";

const API_URL = "http://localhost:8000/api/facial"; // 👈 ajusta si usas otro puerto/backend

// Key de terminal que el backend espera (debe existir en AccessTerminal en la BD)
const TERMINAL_KEY = "mi_api_key_segura"; // cámbialo por el real de tu terminal

// Listar eventos (GET)
export async function listEvents(params = {}) {
  const res = await axios.get(`${API_URL}/events/`, {
    headers: { "X-Terminal-Key": TERMINAL_KEY },
    params,
  });
  return res.data;
}

// Identificación (1:N) - busca al usuario más parecido
export async function identifyFace({ image_b64, embedding, threshold = 0.75 }) {
  const res = await axios.post(
    `${API_URL}/events/identify/`,
    { image_b64, embedding, threshold },
    { headers: { "X-Terminal-Key": TERMINAL_KEY } }
  );
  return res.data;
}

// Verificación (1:1) - compara contra un usuario específico
export async function verifyFace({ usuario, image_b64, embedding, threshold = 0.75 }) {
  const res = await axios.post(
    `${API_URL}/events/verify/`,
    { usuario, image_b64, embedding, threshold },
    { headers: { "X-Terminal-Key": TERMINAL_KEY } }
  );
  return res.data;
}
