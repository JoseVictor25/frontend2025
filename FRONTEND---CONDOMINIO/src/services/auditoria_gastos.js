// src/services/auditoria_gastos.js
import { api } from "@/services/api";

/** Fija aquí tu endpoint real cuando lo confirmes:
 *   const RESOURCE = "auditoria-gastos/";
 * y usa RESOURCE en lugar de resource().
 */
const CANDIDATES = [
  "auditoria-gastos/",
  "auditoria/egresos/",
  "gastos/auditoria/",
  "expenses/audit/",
];

let RES_CACHE = null;
async function resource() {
  if (RES_CACHE) return RES_CACHE;
  for (const p of CANDIDATES) {
    try { await api.get(p, { params: { page: 1 } }); RES_CACHE = p; return p; } catch {}
  }
  RES_CACHE = CANDIDATES[0];
  return RES_CACHE;
}

/* --------- Mappers (tolerantes) --------- */
const fromRow = (r = {}) => ({
  id: r.id ?? r.pk,
  fecha: r.fecha ?? r.date ?? r.created_at ?? "",
  categoria: r.categoria ?? r.category ?? "",
  subcategoria: r.subcategoria ?? r.subcategory ?? "",
  proveedor: r.proveedor ?? r.vendor ?? r.proveedor_id ?? r.vendor_id ?? "",
  descripcion: r.descripcion ?? r.description ?? r.detalle ?? "",
  moneda: r.moneda ?? r.currency ?? "BOB",

  // montos
  base: Number(r.base ?? r.neto ?? r.amount ?? 0),
  impuesto: Number(r.impuesto ?? r.tax ?? 0),     // monto, no %
  otros: Number(r.otros ?? r.other_costs ?? 0),
  total: Number(r.total ?? r.amount_total ?? (Number(r.base||0)+Number(r.impuesto||0)+Number(r.otros||0))),

  // vínculos opcionales
  factura_id: r.factura_id ?? r.invoice_id ?? null,
  factura_numero: r.factura_numero ?? r.invoice_number ?? "",
  reparacion_id: r.reparacion_id ?? r.repair_id ?? null,
  area: r.area ?? r.area_id ?? r.amenity ?? null,
  unidad: r.unidad ?? r.unit ?? r.unidad_id ?? r.unit_id ?? null,

  // estado/conciliación
  estado: r.estado ?? r.status ?? "REGISTRADO",   // REGISTRADO | CONCILIADO | OBSERVADO
  observacion: r.observacion ?? r.notes ?? "",

  raw: r,
});

const toQuery = (q = {}) => {
  const out = {
    page: q.page,
    page_size: q.page_size,
    search: q.search,
    categoria: q.categoria,
    subcategoria: q.subcategoria,
    proveedor: q.proveedor,
    estado: q.estado,
    unidad: q.unidad,
    area: q.area,
    reparacion: q.reparacion,
    factura: q.factura,
    desde: q.desde,
    hasta: q.hasta,
    moneda: q.moneda,
    ordering: q.ordering,
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === null || out[k] === "") && delete out[k]);
  return out;
};

/* --------- API --------- */
export async function listAuditoriaGastos(params = {}) {
  const { data } = await api.get(await resource(), { params: toQuery(params) });
  const items = Array.isArray(data) ? data : (data.results || []);
  return {
    count: Array.isArray(data) ? items.length : (data.count ?? items.length),
    results: items.map(fromRow),
    // si el backend envía agregados, pásalos
    totals: data.totals || null,
    by_category: data.by_category || null,
  };
}

/** Si tu API permite conciliar/observar con PATCH */
export async function setEstadoGasto(id, estado, extra = {}) {
  const { data } = await api.patch(`${await resource()}${id}/`, { estado, ...extra });
  return fromRow(data);
}
