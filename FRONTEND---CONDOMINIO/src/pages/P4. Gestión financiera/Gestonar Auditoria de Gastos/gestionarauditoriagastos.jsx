// src/pages/Finanzas/Auditoria/auditoriagastos.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Tag, Input, Select, DatePicker, message, Modal, Divider, Tooltip, Card
} from "antd";
import dayjs from "dayjs";
import { listAuditoriaGastos, setEstadoGasto } from "@/services/auditoria_gastos";
import { listReparaciones } from "@/services/reparaciones";
import { listFacturas } from "@/services/facturas";
import { listAreas } from "@/services/areas_comunes";
import { searchUnidades } from "@/services/unidades";

const { RangePicker } = DatePicker;
const fmt = "YYYY-MM-DD";

export default function AuditoriaGastos() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState();
  const [subcategoria, setSubcategoria] = useState();
  const [proveedor, setProveedor] = useState();
  const [estado, setEstado] = useState();
  const [unidad, setUnidad] = useState();
  const [area, setArea] = useState();
  const [reparacion, setReparacion] = useState();
  const [factura, setFactura] = useState();
  const [moneda, setMoneda] = useState();
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);

  // selects async
  const [uniOpts, setUniOpts] = useState([]);
  const [areaOpts, setAreaOpts] = useState([]);
  const [repOpts, setRepOpts] = useState([]);
  const [facOpts, setFacOpts] = useState([]);
  const [lookLoading, setLookLoading] = useState(false);

  // agregados
  const [agg, setAgg] = useState({ totals: null, by_category: null });

  async function fetchLookups(term = "") {
    setLookLoading(true);
    try {
      const u = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((u || []).map(x => ({ value: x.id, label: x.label ?? String(x.id) })));
    } catch {}
    try {
      const a = await listAreas?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = a?.results || a || [];
      setAreaOpts(arr.map(x => ({ value: x.id, label: x.nombre || `Área ${x.id}` })));
    } catch {}
    try {
      const r = await listReparaciones?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = r?.results || r || [];
      setRepOpts(arr.map(x => ({ value: x.id, label: x.codigo || x.titulo || `Rep. ${x.id}` })));
    } catch {}
    try {
      const f = await listFacturas?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = f?.results || f || [];
      setFacOpts(arr.map(x => ({ value: x.id, label: x.numero ? `#${x.numero}` : `Factura ${x.id}` })));
    } catch {}
    setLookLoading(false);
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = {
      page, page_size: pageSize, ordering: "-fecha",
      search: q?.trim() || undefined,
      categoria, subcategoria, proveedor, estado, unidad, area,
      reparacion, factura, moneda,
      desde: range?.[0]?.format(fmt), hasta: range?.[1]?.format(fmt),
    };
    Object.keys(params).forEach(k => (params[k] === undefined || params[k] === null || params[k] === "") && delete params[k]);
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listAuditoriaGastos(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
      setAgg({ totals: res.totals, by_category: res.by_category });
    } catch (e) {
      console.error(e); message.error("No se pudo cargar la auditoría de gastos");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchLookups(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "Fecha", dataIndex: "fecha", width: 120, render: v => v || "-" },
    { title: "Categoría", dataIndex: "categoria", width: 160, render: v => v || "-" },
    { title: "Subcat.", dataIndex: "subcategoria", width: 160, render: v => v || "-" },
    { title: "Proveedor", dataIndex: "proveedor", width: 200, ellipsis: true, render: v => v || "-" },
    { title: "Descripción", dataIndex: "descripcion", ellipsis: true },
    { title: "Moneda", dataIndex: "moneda", width: 90 },
    { title: "Base", dataIndex: "base", width: 110, align: "right", render: v => Number(v||0).toFixed(2) },
    { title: "Impuesto", dataIndex: "impuesto", width: 110, align: "right", render: v => Number(v||0).toFixed(2) },
    { title: "Otros", dataIndex: "otros", width: 110, align: "right", render: v => Number(v||0).toFixed(2) },
    { title: "Total", dataIndex: "total", width: 120, align: "right", render: v => <b>{Number(v||0).toFixed(2)}</b> },
    {
      title: "Estado", dataIndex: "estado", width: 140,
      render: v => <Tag color={estadoColor(v)}>{v || "-"}</Tag>
    },
    {
      title: "Vínculos", width: 220,
      render: (_, r) => (
        <Space size="small">
          {r.factura_id ? <Tag>Factura #{r.factura_numero || r.factura_id}</Tag> : null}
          {r.reparacion_id ? <Tag color="blue">Rep. {r.reparacion_id}</Tag> : null}
          {r.unidad ? <Tag color="geekblue">U {r.unidad}</Tag> : null}
          {r.area ? <Tag color="purple">Área {r.area}</Tag> : null}
        </Space>
      )
    },
    {
      title: "Acción", width: 260,
      render: (_, r) => (
        <Space>
          {r.estado !== "CONCILIADO" && <Typography.Link onClick={() => cambiarEstado(r, "CONCILIADO")}>Conciliar</Typography.Link>}
          {r.estado !== "OBSERVADO" && <Typography.Link onClick={() => observar(r)}>Observar</Typography.Link>}
          <DetalleBtn row={r} />
        </Space>
      )
    }
  ], []);

  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "CONCILIADO": return "green";
      case "OBSERVADO": return "volcano";
      case "REGISTRADO": default: return "default";
    }
  }

  async function cambiarEstado(row, nuevo) {
    try {
      await setEstadoGasto(row.id, nuevo);
      message.success(`Estado: ${nuevo}`);
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo actualizar el estado"); }
  }

  function observar(row) {
    let reason = "";
    Modal.confirm({
      title: `Marcar como OBSERVADO`,
      content: (
        <Input.TextArea
          autoFocus
          placeholder="Motivo de observación"
          onChange={(e) => { reason = e.target.value; }}
        />
      ),
      okText: "Guardar",
      onOk: async () => {
        try {
          await setEstadoGasto(row.id, "OBSERVADO", { observacion: reason || undefined });
          message.success("Marcado como observado");
          fetchData(pag.current, pag.pageSize);
        } catch { message.error("No se pudo observar"); }
      },
    });
  }

  // totales calculados del cliente por si el backend no los envía
  const totalPeriodo = useMemo(
    () => data.reduce((acc, r) => acc + Number(r.total || 0), 0),
    [data]
  );
  const resumenCategoria = useMemo(() => {
    if (agg.by_category) return agg.by_category;
    const map = {};
    for (const r of data) {
      const key = r.categoria || "Sin categoría";
      map[key] = (map[key] || 0) + Number(r.total || 0);
    }
    // transformar a lista
    return Object.entries(map).map(([categoria, total]) => ({ categoria, total }));
  }, [data, agg]);

  function exportCSV() {
    const headers = ["Fecha", "Categoría", "Subcategoría", "Proveedor", "Descripción", "Moneda", "Base", "Impuesto", "Otros", "Total", "Estado"];
    const rows = data.map(r => [
      r.fecha || "", r.categoria || "", r.subcategoria || "", (r.proveedor || "").toString().replace(/[\r\n]+/g, " "),
      (r.descripcion || "").toString().replace(/[\r\n]+/g, " "), r.moneda || "BOB",
      Number(r.base || 0).toFixed(2), Number(r.impuesto || 0).toFixed(2), Number(r.otros || 0).toFixed(2),
      Number(r.total || 0).toFixed(2), r.estado || "REGISTRADO"
    ]);
    const csv = [headers, ...rows].map(a => a.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `auditoria_gastos_${range?.[0]?.format(fmt) || "desde"}-${range?.[1]?.format(fmt) || "hasta"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Buscar proveedor/descr." allowClear value={q} onChange={(e)=>setQ(e.target.value)} onSearch={() => fetchData(1, pag.pageSize)} style={{ width: 260 }} />
        <Input placeholder="Categoría" allowClear value={categoria} onChange={(e)=>setCategoria(e.target.value)} style={{ width: 160 }} />
        <Input placeholder="Subcategoría" allowClear value={subcategoria} onChange={(e)=>setSubcategoria(e.target.value)} style={{ width: 160 }} />
        <Input placeholder="Proveedor" allowClear value={proveedor} onChange={(e)=>setProveedor(e.target.value)} style={{ width: 180 }} />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} style={{ width: 160 }}
          options={[{value:"REGISTRADO",label:"Registrado"},{value:"CONCILIADO",label:"Conciliado"},{value:"OBSERVADO",label:"Observado"}]} />
        <Select showSearch allowClear placeholder="Unidad" value={unidad} onChange={setUnidad} onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={uniOpts} />
        <Select showSearch allowClear placeholder="Área común" value={area} onChange={setArea} onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={areaOpts} />
        <Select showSearch allowClear placeholder="Reparación" value={reparacion} onChange={setReparacion} onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={repOpts} />
        <Select showSearch allowClear placeholder="Factura" value={factura} onChange={setFactura} onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={facOpts} />
        <Select placeholder="Moneda" allowClear value={moneda} onChange={setMoneda} style={{ width: 120 }}
          options={[{value:"BOB",label:"BOB"},{value:"USD",label:"USD"}]} />
        <RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setCategoria(); setSubcategoria(); setProveedor(); setEstado(); setUnidad(); setArea(); setReparacion(); setFactura(); setMoneda(); setRange([null, null]); fetchData(1, pag.pageSize); }}>Limpiar</Button>
        <Button onClick={exportCSV}>Exportar CSV</Button>
      </Space>

      {/* KPIs rápidos */}
      <Kpis totals={agg.totals} fallbackTotal={totalPeriodo} resumenCategoria={resumenCategoria} moneda={moneda || "BOB"} />

      <Table
        rowKey={(r, i) => r.id ?? i}
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
      />
    </div>
  );
}

/* ---------- Componentes auxiliares ---------- */
function Kpis({ totals, fallbackTotal, resumenCategoria, moneda }) {
  const total = totals?.total ?? fallbackTotal ?? 0;
  const base = totals?.base ?? null;
  const imp = totals?.impuesto ?? null;
  const otros = totals?.otros ?? null;

  return (
    <Space style={{ width: "100%", marginBottom: 12 }} wrap>
      <Card size="small" title="Total período">
        <Typography.Title level={4} style={{ margin: 0 }}>{moneda} {Number(total).toFixed(2)}</Typography.Title>
        {base != null && <Typography.Text type="secondary">Base: {Number(base).toFixed(2)} | Imp.: {Number(imp||0).toFixed(2)} | Otros: {Number(otros||0).toFixed(2)}</Typography.Text>}
      </Card>
      <Card size="small" title="Por categoría">
        {resumenCategoria?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, minWidth: 320, maxWidth: 960 }}>
            {resumenCategoria.map((c) => (
              <div key={c.categoria} style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text>{c.categoria}</Typography.Text>
                <Typography.Text strong>{Number(c.total || 0).toFixed(2)}</Typography.Text>
              </div>
            ))}
          </div>
        ) : (
          <Typography.Text type="secondary">Sin datos</Typography.Text>
        )}
      </Card>
    </Space>
  );
}

function DetalleBtn({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Typography.Link onClick={() => setOpen(true)}>Detalle</Typography.Link>
      <Modal open={open} title={`Gasto #${row?.id ?? ""}`} onCancel={() => setOpen(false)} footer={null} width={720}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <KV k="Fecha" v={row.fecha || "-"} />
          <KV k="Proveedor" v={row.proveedor || "-"} />
          <KV k="Categoría" v={row.categoria || "-"} />
          <KV k="Subcategoría" v={row.subcategoria || "-"} />
          <KV k="Descripción" v={row.descripcion || "-"} />
          <Divider style={{ margin: "8px 0" }} />
          <KV k="Base" v={Number(row.base||0).toFixed(2)} />
          <KV k="Impuesto" v={Number(row.impuesto||0).toFixed(2)} />
          <KV k="Otros" v={Number(row.otros||0).toFixed(2)} />
          <KV k="Total" v={<b>{Number(row.total||0).toFixed(2)}</b>} />
          <Divider style={{ margin: "8px 0" }} />
          <KV k="Moneda" v={row.moneda || "BOB"} />
          <KV k="Estado" v={<Tag color={row.estado==="CONCILIADO"?"green":row.estado==="OBSERVADO"?"volcano":"default"}>{row.estado}</Tag>} />
          <KV k="Observación" v={row.observacion || "-"} />
          <Divider style={{ margin: "8px 0" }} />
          <Space wrap>
            {row.factura_id && <Tag>Factura #{row.factura_numero || row.factura_id}</Tag>}
            {row.reparacion_id && <Tag color="blue">Reparación {row.reparacion_id}</Tag>}
            {row.unidad && <Tag color="geekblue">Unidad {row.unidad}</Tag>}
            {row.area && <Tag color="purple">Área {row.area}</Tag>}
          </Space>
        </Space>
      </Modal>
    </>
  );
}
function KV({ k, v }) {
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Typography.Text type="secondary">{k}</Typography.Text>
      {typeof v === "string" || typeof v === "number" ? <Typography.Text>{v}</Typography.Text> : v}
    </Space>
  );
}
