import { api } from "@/services/api";

const PRIMARY = "unidades/";
const FALLBACK = "units/";

async function resource() {
  try { await api.get(PRIMARY, { params: { page: 1 } }); return PRIMARY; }
  catch { return FALLBACK; }
}

// Buscar/paginar unidades (para el <Select>)
export async function searchUnidades(params = {}) {
  const res = await api.get(await resource(), { params });
  const data = res.data;
  const items = Array.isArray(data) ? data : (data.results || []);
  // Normaliza a {id/uuid, label}
  return items.map(u => ({
    id: u.id ?? u.uuid ?? u.uid ?? u.pk ?? u.unidad_id,
    label: u.nombre ?? u.name ?? u.codigo ?? u.code ?? (u.id || u.uuid),
    raw: u,
  }));
}
