// src/services/notificaciones.js
import { api } from "@/services/api";

const RESOURCE = "notificaciones/";

/** Mapear del backend -> UI */
const toUI = (r = {}) => ({
  id: r.id ?? r.uuid ?? r.pk,
  titulo: r.titulo ?? r.title ?? "-",
  mensaje: r.mensaje ?? r.body ?? r.cuerpo ?? "",            // <- backend usa "cuerpo"
  tipo: r.tipo ?? r.category ?? null,
  // prioridad backend: "low|normal|high|critical" -> UI: "BAJA|NORMAL|ALTA|CRITICA"
  prioridad: mapPriorB2F(r.prioridad ?? r.priority),
  // canal backend: "inapp|email|sms|push?" -> UI: "PUSH|EMAIL|SMS"
  canal: mapCanalB2F(r.canal ?? r.channel),
  estado: r.estado ?? r.status ?? (r.leida ? "LEIDA" : "NO_LEIDA"),
  leida: typeof r.leida === "boolean" ? r.leida : (r.estado === "LEIDA"),
  destinatario: r.destinatario ?? r.to ?? r.user ?? r.unidad ?? null,
  destinatario_tipo: r.destinatario_tipo ?? r.to_type ?? r.scope ?? null,
  programada: r.programada ?? Boolean(r.fecha_programada),
  fecha_programada: r.fecha_programada ?? r.scheduled_at ?? null,
  fecha_envio: r.fecha_envio ?? r.sent_at ?? null,
});

/** Mapear de UI -> backend */
const toBackend = (p = {}) => {
  const out = {
    titulo: p.titulo ?? p.title ?? "",
    cuerpo: p.mensaje ?? p.cuerpo ?? p.body ?? "",           // <- enviar "cuerpo"
    tipo: p.tipo ?? p.type ?? p.category ?? undefined,
    prioridad: mapPriorF2B(p.prioridad ?? p.priority),
    canal: mapCanalF2B(p.canal ?? p.channel),
    estado: p.estado ?? p.status ?? undefined,
    leida: p.leida ?? p.read ?? undefined,
    destinatario: p.destinatario ?? p.to ?? p.user ?? p.unit ?? undefined,
    destinatario_tipo: p.destinatario_tipo ?? p.to_type ?? p.scope ?? undefined,
    programada: p.programada ?? p.scheduled ?? undefined,
    // DRF se lleva mejor con ISO 8601
    fecha_programada: p.fecha_programada
      ? toISO(p.fecha_programada)
      : p.scheduled_at
  };
  // limpia null/undefined
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* Helpers */
function toISO(d) {
  // si ya viene con dayjs (u objeto Date), conviértelo a ISO
  try {
    if (typeof d?.toISOString === "function") return d.toISOString();
    if (typeof d?.format === "function") return d.toDate().toISOString();
    // si viene como "YYYY-MM-DD HH:mm", intenta parsearlo
    const t = new Date(d.replace(" ", "T"));
    if (!isNaN(t)) return t.toISOString();
  } catch {}
  return d;
}
function mapPriorF2B(v) {
  switch ((v || "").toUpperCase()) {
    case "BAJA": return "low";
    case "NORMAL": return "normal";
    case "ALTA": return "high";
    case "CRITICA": return "critical";
    default: return undefined;
  }
}
function mapPriorB2F(v) {
  switch ((v || "").toLowerCase()) {
    case "low": return "BAJA";
    case "normal": return "NORMAL";
    case "high": return "ALTA";
    case "critical": return "CRITICA";
    default: return v;
  }
}
function mapCanalF2B(v) {
  switch ((v || "").toUpperCase()) {
    case "PUSH": return "inapp";
    case "EMAIL": return "email";
    case "SMS": return "sms";
    default: return v?.toLowerCase?.() ?? v;
  }
}
function mapCanalB2F(v) {
  switch ((v || "").toLowerCase()) {
    case "inapp": return "PUSH";
    case "email": return "EMAIL";
    case "sms": return "SMS";
    default: return v?.toUpperCase?.() ?? v;
  }
}

/* API */
export async function listNotificaciones(params = {}) {
  // evita mandar filtros vacíos (algunos DRF filtersets revientan)
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) clean[k] = v;
  });
  const { data } = await api.get(RESOURCE, { params: clean });
  const items = Array.isArray(data) ? data : (data.results || []);
  const count = Array.isArray(data) ? items.length : (data.count ?? items.length);
  return { count, results: items.map(toUI) };
}

export async function createNotificacion(payload) {
  const { data } = await api.post(RESOURCE, toBackend(payload));
  return toUI(data);
}

// ← PATCH (no PUT) para parches parciales
export async function updateNotificacion(id, payload) {
  const { data } = await api.patch(`${RESOURCE}${id}/`, toBackend(payload));
  return toUI(data);
}

export async function deleteNotificacion(id) {
  await api.delete(`${RESOURCE}${id}/`);
}

export async function marcarLeida(id, leida = true) {
  const body = leida ? { leida: true, estado: "LEIDA" } : { leida: false, estado: "NO_LEIDA" };
  const { data } = await api.patch(`${RESOURCE}${id}/`, body);
  return toUI(data);
}

export async function reenviarNotificacion(id) {
  try {
    const { data } = await api.post(`${RESOURCE}${id}/reenviar/`);
    return data;
  } catch {
    const { data } = await api.post(`${RESOURCE}${id}/resend/`);
    return data;
  }
}

export async function enviarAhora(id) {
  const { data } = await api.post(`${RESOURCE}${id}/enviar/`);
  return data;
}
