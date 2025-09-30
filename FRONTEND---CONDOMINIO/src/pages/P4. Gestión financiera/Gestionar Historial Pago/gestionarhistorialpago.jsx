// src/pages/Finanzas/Pagos/historialpagos.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Modal, Tag,
  Input, Select, DatePicker, message
} from "antd";
import dayjs from "dayjs";
import { listPagos, downloadReciboPDF } from "@/services/pagos";
import { listFacturas } from "@/services/facturas";

const { RangePicker } = DatePicker;
const fmt = "YYYY-MM-DD";

export default function HistorialPagos() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  // filtros
  const [q, setQ] = useState("");
  const [metodo, setMetodo] = useState();
  const [estado, setEstado] = useState();
  const [factura, setFactura] = useState();
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);

  // select facturas
  const [factOpts, setFactOpts] = useState([]);
  const [factLoading, setFactLoading] = useState(false);

  async function fetchFacturas(term = "") {
    setFactLoading(true);
    try {
      const res = await listFacturas({ page: 1, page_size: 20, search: term || undefined });
      const items = res?.results || [];
      setFactOpts(items.map((f) => ({
        value: f.id,
        label: f.numero ? `#${f.numero} — ${f.cliente_nombre || ""}` : `Factura ${f.id}`,
      })));
    } catch { setFactOpts([]); }
    finally { setFactLoading(false); }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (metodo) params.metodo = metodo;
    if (estado) params.estado = estado;
    if (factura) params.factura_id = factura;
    if (range?.length === 2) {
      params.desde = range[0].format(fmt);
      params.hasta = range[1].format(fmt);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listPagos(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar el historial");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchFacturas(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Factura", dataIndex: "factura_numero", width: 150, render: (v, r) => v || (r.factura_id ? `#${r.factura_id}` : "-") },
    { title: "Fecha", dataIndex: "fecha", width: 120 },
    { title: "Monto", dataIndex: "monto", width: 120, align: "right", render: v => Number(v || 0).toFixed(2) },
    { title: "Método", dataIndex: "metodo", width: 140, render: v => <Tag color={metodoColor(v)}>{v}</Tag> },
    { title: "Ref.", dataIndex: "referencia", ellipsis: true },
    { title: "Estado", dataIndex: "estado", width: 130, render: v => <Tag color={estadoColor(v)}>{v}</Tag> },
    {
      title: "Acción", width: 160,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => setDetail(r)}>Detalle</Typography.Link>
          <Typography.Link onClick={() => descargarRecibo(r)}>Recibo</Typography.Link>
        </Space>
      )
    }
  ], []);

  function metodoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "TARJETA": return "geekblue";
      case "TRANSFERENCIA": return "purple";
      case "QR": return "cyan";
      case "EFECTIVO": default: return "green";
    }
  }
  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "CONFIRMADO": return "green";
      case "PENDIENTE": return "gold";
      case "ANULADO": return "red";
      default: return "default";
    }
  }

  async function descargarRecibo(row) {
    try {
      const blob = await downloadReciboPDF(row.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo_pago_${row.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { message.info("No hay recibo PDF disponible"); }
  }

  const totalPeriodo = useMemo(
    () => data.reduce((acc, p) => acc + (String(p.estado).toUpperCase() === "CONFIRMADO" ? Number(p.monto || 0) : 0), 0),
    [data]
  );

  function exportCSV() {
    const headers = ["ID", "Factura", "Fecha", "Monto", "Método", "Referencia", "Estado"];
    const rows = data.map(r => [
      r.id,
      r.factura_numero || r.factura_id || "",
      r.fecha || "",
      Number(r.monto || 0).toFixed(2),
      r.metodo || "",
      (r.referencia || "").replace(/[\r\n]+/g, " "),
      r.estado || "",
    ]);
    const csv = [headers, ...rows].map(a => a.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial_pagos_${(range?.[0]?.format(fmt) || "desde")}-${(range?.[1]?.format(fmt) || "hasta")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar ref./observación"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Método"
          allowClear
          value={metodo}
          onChange={setMetodo}
          style={{ width: 170 }}
          options={[
            { value: "EFECTIVO", label: "Efectivo" },
            { value: "TARJETA", label: "Tarjeta" },
            { value: "TRANSFERENCIA", label: "Transferencia" },
            { value: "QR", label: "QR" },
          ]}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={estado}
          onChange={setEstado}
          style={{ width: 170 }}
          options={[
            { value: "CONFIRMADO", label: "Confirmado" },
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "ANULADO", label: "Anulado" },
          ]}
        />
        <Select
          placeholder="Factura"
          allowClear
          value={factura}
          onChange={setFactura}
          showSearch
          onSearch={(t) => fetchFacturas(t)}
          filterOption={false}
          loading={factLoading}
          style={{ minWidth: 260 }}
          options={factOpts}
        />
        <RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setMetodo(); setEstado(); setFactura(); setRange([null, null]); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
        <Button onClick={exportCSV}>Exportar CSV</Button>
      </Space>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
        footer={() => (
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Typography.Text strong>Total confirmado del período:</Typography.Text>
            <Typography.Text strong>{totalPeriodo.toFixed(2)}</Typography.Text>
          </Space>
        )}
      />

      <Modal
        title={`Detalle pago #${detail?.id ?? ""}`}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
      >
        {detail && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Item label="Factura">{detail.factura_numero || detail.factura_id || "-"}</Item>
            <Item label="Fecha">{detail.fecha || "-"}</Item>
            <Item label="Monto">{Number(detail.monto || 0).toFixed(2)}</Item>
            <Item label="Moneda">{detail.moneda || "-"}</Item>
            <Item label="Método">{detail.metodo || "-"}</Item>
            <Item label="Referencia">{detail.referencia || "-"}</Item>
            <Item label="Estado">{detail.estado || "-"}</Item>
            <Item label="Observación">{detail.observacion || "-"}</Item>
            <Space>
              <Button onClick={() => descargarRecibo(detail)}>Descargar recibo</Button>
              <Button onClick={() => setDetail(null)}>Cerrar</Button>
            </Space>
          </Space>
        )}
      </Modal>
    </div>
  );
}

function Item({ label, children }) {
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text>{children}</Typography.Text>
    </Space>
  );
}
