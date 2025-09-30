// src/pages/Reportes/gestionarreportes.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Row, Col, Space, Typography, DatePicker, Select, Button, message, Table, Tag, Divider
} from "antd";
import dayjs from "dayjs";
import { fetchReporte, kpiSum } from "@/services/reportes";
import { listPagos } from "@/services/pagos";
import { listMultas } from "@/services/multas";
import { listReparaciones } from "@/services/reparaciones";
import { listTareas } from "@/services/tareas_mantenimiento";
import { listBitacora } from "@/services/bitacora";

import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const { RangePicker } = DatePicker;
const fmt = "YYYY-MM-DD";

export default function GestionarReportes() {
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [moneda, setMoneda] = useState("BOB");
  const [loading, setLoading] = useState(false);

  // datos por pestaña
  const [fin, setFin] = useState({ pagos: [], multas: [], serieIngresos: [], serieMultas: [], kpis: {} });
  const [mnt, setMnt] = useState({ tareas: [], reparaciones: [], serieTareas: [], serieCostos: [], kpis: {} });
  const [ops, setOps] = useState({ bitacora: [], serieTurno: [], kpis: {} });

  const params = useMemo(() => ({
    desde: range?.[0]?.format(fmt),
    hasta: range?.[1]?.format(fmt),
    moneda,
  }), [range, moneda]);

  useEffect(() => { loadAll(); /* eslint-disable-line */ }, [params.desde, params.hasta, params.moneda]);

  async function loadAll() {
    setLoading(true);
    try {
      // 1) FINANZAS (intenta backend /reportes/finanzas, si no hay, calcula con servicios)
      let finResp = {};
      try { finResp = await fetchReporte("finanzas", params); } catch {}
      if (finResp?.results) {
        setFin(mapFinFromApi(finResp));
      } else {
        const pagos = (await listPagos({ desde: params.desde, hasta: params.hasta })).results || [];
        const multas = (await listMultas({ desde: params.desde, hasta: params.hasta })).results || [];
        setFin(buildFinFromClient(pagos, multas));
      }

      // 2) MANTENIMIENTO
      let mntResp = {};
      try { mntResp = await fetchReporte("mantenimiento", params); } catch {}
      if (mntResp?.results) {
        setMnt(mapMntFromApi(mntResp));
      } else {
        const tareas = (await listTareas({ desde: params.desde, hasta: params.hasta })).results || [];
        const reparaciones = (await listReparaciones({ desde: params.desde, hasta: params.hasta })).results || [];
        setMnt(buildMntFromClient(tareas, reparaciones));
      }

      // 3) OPERACIÓN (bitácora)
      let opsResp = {};
      try { opsResp = await fetchReporte("operacion", params); } catch {}
      if (opsResp?.results) {
        setOps(mapOpsFromApi(opsResp));
      } else {
        const bitacora = (await listBitacora({ desde: params.desde, hasta: params.hasta })).results || [];
        setOps(buildOpsFromClient(bitacora));
      }
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los reportes");
    } finally { setLoading(false); }
  }

  /* ---------- Mappers / builders ---------- */
  function mapFinFromApi(data) {
    const pagos = data?.pagos || data?.results?.pagos || [];
    const multas = data?.multas || data?.results?.multas || [];
    const serieIngresos = data?.serieIngresos || groupByDateSum(pagos, "fecha", "monto");
    const serieMultas = data?.serieMultas || groupByDateSum(multas, "fecha", "monto");
    const kpis = {
      ingresos: data?.kpis?.ingresos ?? kpiSum(pagos, (x) => x.monto),
      multas: data?.kpis?.multas ?? kpiSum(multas, (x) => x.monto),
      tickets: data?.kpis?.tickets ?? (pagos?.length || 0),
    };
    return { pagos, multas, serieIngresos, serieMultas, kpis };
  }
  function buildFinFromClient(pagos, multas) {
    const serieIngresos = groupByDateSum(pagos, "fecha", "monto");
    const serieMultas = groupByDateSum(multas, "fecha", "monto");
    const kpis = {
      ingresos: kpiSum(pagos, (x) => x.monto),
      multas: kpiSum(multas, (x) => x.monto),
      tickets: pagos.length,
    };
    return { pagos, multas, serieIngresos, serieMultas, kpis };
  }

  function mapMntFromApi(data) {
    const tareas = data?.tareas || [];
    const reparaciones = data?.reparaciones || [];
    const serieTareas = data?.serieTareas || groupCountByDate(tareas, "fecha_programada");
    const serieCostos = data?.serieCostos || groupByDateSum(reparaciones, "fecha", "total");
    const kpis = {
      tareas: data?.kpis?.tareas ?? (tareas?.length || 0),
      completas: data?.kpis?.completas ?? tareas.filter(t => (t.estado || "").toUpperCase() === "COMPLETADA").length,
      costo: data?.kpis?.costo ?? kpiSum(reparaciones, (x) => x.total),
    };
    return { tareas, reparaciones, serieTareas, serieCostos, kpis };
  }
  function buildMntFromClient(tareas, reparaciones) {
    const serieTareas = groupCountByDate(tareas, "fecha_programada");
    const serieCostos = groupByDateSum(reparaciones, "fecha", "total");
    const kpis = {
      tareas: tareas.length,
      completas: tareas.filter(t => (t.estado || "").toUpperCase() === "COMPLETADA").length,
      costo: kpiSum(reparaciones, (x) => x.total),
    };
    return { tareas, reparaciones, serieTareas, serieCostos, kpis };
  }

  function mapOpsFromApi(data) {
    const bitacora = data?.bitacora || [];
    const serieTurno = data?.serieTurno || groupByValueCount(bitacora, "turno");
    const kpis = {
      entradas: data?.kpis?.entradas ?? (bitacora?.length || 0),
      cerradas: data?.kpis?.cerradas ?? bitacora.filter(b => (b.estado || "").toUpperCase() === "CERRADO").length,
    };
    return { bitacora, serieTurno, kpis };
  }
  function buildOpsFromClient(bitacora) {
    const serieTurno = groupByValueCount(bitacora, "turno");
    const kpis = {
      entradas: bitacora.length,
      cerradas: bitacora.filter(b => (b.estado || "").toUpperCase() === "CERRADO").length,
    };
    return { bitacora, serieTurno, kpis };
  }

  /* ---------- utils de agrupación ---------- */
  function groupByDateSum(list, dateKey, amountKey) {
    const map = {};
    for (const r of list) {
      const d = (r[dateKey] || "").slice(0, 10);
      const v = Number(r[amountKey] || 0);
      if (!d) continue;
      map[d] = (map[d] || 0) + v;
    }
    return Object.entries(map).sort(([a],[b]) => (a>b?1:-1)).map(([date, total]) => ({ date, total: +total.toFixed(2) }));
  }
  function groupCountByDate(list, dateKey) {
    const map = {};
    for (const r of list) {
      const d = (r[dateKey] || "").slice(0, 10);
      if (!d) continue;
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map).sort(([a],[b]) => (a>b?1:-1)).map(([date, count]) => ({ date, count }));
  }
  function groupByValueCount(list, key) {
    const map = {};
    for (const r of list) {
      const k = r[key] || "N/D";
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }

  /* ---------- export ---------- */
  function exportCSV(rows, filename, headers) {
    const csv = [headers, ...rows]
      .map(a => a.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- VISTA ---------- */
  return (
    <div style={{ padding: 24 }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker value={range} onChange={setRange} format={fmt} />
        <Select value={moneda} onChange={setMoneda} style={{ width: 120 }}
          options={[{value:"BOB",label:"BOB"},{value:"USD",label:"USD"}]} />
        <Button onClick={loadAll} loading={loading}>Actualizar</Button>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </Space>

      {/* FINANZAS */}
      <Card title="Finanzas — Ingresos y Multas" style={{ marginBottom: 16 }}>
        <Row gutter={[16,16]}>
          <Col xs={24} md={8}><Kpi title="Ingresos" value={`${moneda} ${Number(fin.kpis.ingresos||0).toFixed(2)}`} /></Col>
          <Col xs={24} md={8}><Kpi title="Multas" value={`${moneda} ${Number(fin.kpis.multas||0).toFixed(2)}`} /></Col>
          <Col xs={24} md={8}><Kpi title="Tickets de pago" value={String(fin.kpis.tickets||0)} /></Col>

          <Col xs={24} md={16}>
            <ChartCard title="Ingresos por día">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={fin.serieIngresos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" /><YAxis /><RTooltip />
                  <Line type="monotone" dataKey="total" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
          <Col xs={24} md={8}>
            <ChartCard title="Multas por día">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fin.serieMultas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" /><YAxis /><RTooltip />
                  <Bar dataKey="total" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>

          <Col span={24}>
            <Divider>Detalle de pagos</Divider>
            <Table
              size="small"
              rowKey={(r,i)=>r.id ?? i}
              dataSource={fin.pagos}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: "Fecha", dataIndex: "fecha", width: 120 },
                { title: "Factura", dataIndex: "factura_numero", width: 140, render:(v,r)=>v||r.factura_id||"-" },
                { title: "Monto", dataIndex: "monto", width: 120, align:"right", render:v=>Number(v||0).toFixed(2) },
                { title: "Método", dataIndex: "metodo", width: 140, render:v=><Tag>{v||"-"}</Tag> },
                { title: "Estado", dataIndex: "estado", width: 140, render:v=><Tag color={(v||"")==="CONFIRMADO"?"green":"gold"}>{v||"-"}</Tag> },
                { title: "Ref", dataIndex: "referencia", ellipsis:true },
              ]}
            />
            <Space style={{ marginTop: 8 }}>
              <Button onClick={()=>exportCSV(
                fin.pagos.map(p=>[p.fecha, p.factura_numero||p.factura_id||"", Number(p.monto||0).toFixed(2), p.metodo||"", p.estado||"", (p.referencia||"").replace(/\r?\n/g," ")]),
                `reporte_pagos_${params.desde}-${params.hasta}.csv`,
                ["Fecha","Factura","Monto","Método","Estado","Referencia"]
              )}>Exportar CSV</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* MANTENIMIENTO */}
      <Card title="Mantenimiento — Tareas y Costos de Reparación" style={{ marginBottom: 16 }}>
        <Row gutter={[16,16]}>
          <Col xs={24} md={6}><Kpi title="Tareas" value={String(mnt.kpis.tareas||0)} /></Col>
          <Col xs={24} md={6}><Kpi title="Completadas" value={String(mnt.kpis.completas||0)} /></Col>
          <Col xs={24} md={12}><Kpi title="Costo reparaciones" value={`${moneda} ${Number(mnt.kpis.costo||0).toFixed(2)}`} /></Col>

          <Col xs={24} md={12}>
            <ChartCard title="Tareas programadas por día">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mnt.serieTareas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" /><YAxis /><RTooltip />
                  <Line type="monotone" dataKey="count" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
          <Col xs={24} md={12}>
            <ChartCard title="Costos de reparación por día">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={mnt.serieCostos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" /><YAxis /><RTooltip />
                  <Bar dataKey="total" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>

          <Col span={24}>
            <Divider>Reparaciones</Divider>
            <Table
              size="small"
              rowKey={(r,i)=>r.id ?? i}
              dataSource={mnt.reparaciones}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: "Fecha", dataIndex: "fecha", width: 120 },
                { title: "Título", dataIndex: "titulo", ellipsis:true },
                { title: "Categoría", dataIndex: "categoria", width: 150 },
                { title: "Proveedor", dataIndex: "proveedor", width: 180, ellipsis:true },
                { title: "Total", dataIndex: "total", width: 120, align:"right", render:v=>Number(v||0).toFixed(2) },
                { title: "Estado", dataIndex: "estado", width: 140, render:v=><Tag color={estadoColor(v)}>{v||"-"}</Tag> },
              ]}
            />
            <Space style={{ marginTop: 8 }}>
              <Button onClick={()=>exportCSV(
                mnt.reparaciones.map(r=>[r.fecha, r.titulo||"", r.categoria||"", r.proveedor||"", Number(r.total||0).toFixed(2), r.estado||""]),
                `reporte_reparaciones_${params.desde}-${params.hasta}.csv`,
                ["Fecha","Título","Categoría","Proveedor","Total","Estado"]
              )}>Exportar CSV</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* OPERACIÓN */}
      <Card title="Operación — Bitácora por turno" style={{ marginBottom: 16 }}>
        <Row gutter={[16,16]}>
          <Col xs={24} md={8}><Kpi title="Entradas bitácora" value={String(ops.kpis.entradas||0)} /></Col>
          <Col xs={24} md={8}><Kpi title="Cerradas" value={String(ops.kpis.cerradas||0)} /></Col>
          <Col xs={24} md={8}><Kpi title="Periodo" value={`${params.desde} → ${params.hasta}`} /></Col>

          <Col span={24}>
            <ChartCard title="Distribución por turno">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie dataKey="value" data={ops.serieTurno} outerRadius={110} label>
                    {ops.serieTurno.map((_, i) => <Cell key={i} />)}
                  </Pie>
                  <Legend /><RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>

          <Col span={24}>
            <Divider>Bitácora (muestra)</Divider>
            <Table
              size="small"
              rowKey={(r,i)=>r.id ?? i}
              dataSource={ops.bitacora}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: "Fecha", dataIndex: "fecha", width: 120 },
                { title: "Hora", dataIndex: "hora", width: 100 },
                { title: "Turno", dataIndex: "turno", width: 120 },
                { title: "Tipo", dataIndex: "tipo", width: 150 },
                { title: "Título", dataIndex: "titulo", ellipsis:true },
                { title: "Estado", dataIndex: "estado", width: 120, render:v=><Tag color={(v||"")==="CERRADO"?"green":"gold"}>{v||"-"}</Tag> },
              ]}
            />
            <Space style={{ marginTop: 8 }}>
              <Button onClick={()=>exportCSV(
                ops.bitacora.map(b=>[b.fecha,b.hora,b.turno||"",b.tipo||"", (b.titulo||"").replace(/\r?\n/g," "), b.estado||""]),
                `reporte_bitacora_${params.desde}-${params.hasta}.csv`,
                ["Fecha","Hora","Turno","Tipo","Título","Estado"]
              )}>Exportar CSV</Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

/* --------- UI helpers --------- */
function Kpi({ title, value }) {
  return (
    <Card size="small">
      <Typography.Text type="secondary">{title}</Typography.Text>
      <Typography.Title level={3} style={{ margin: 0 }}>{value}</Typography.Title>
    </Card>
  );
}
function ChartCard({ title, children }) {
  return (
    <Card size="small" bodyStyle={{ padding: 12 }}>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <div style={{ height: 12 }} />
      {children}
    </Card>
  );
}
function estadoColor(v) {
  switch ((v || "").toUpperCase()) {
    case "EN_PROCESO": return "blue";
    case "COMPLETADO":
    case "COMPLETADA": return "green";
    case "ANULADO":
    case "CANCELADA": return "red";
    case "PENDIENTE": return "gold";
    default: return "default";
  }
}
