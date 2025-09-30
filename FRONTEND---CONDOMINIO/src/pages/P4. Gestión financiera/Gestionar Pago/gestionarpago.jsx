// src/pages/Finanzas/Pagos/gestionarpagos.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker
} from "antd";
import dayjs from "dayjs";
import { listPagos, createPago, updatePago, deletePago, setEstadoPago, downloadReciboPDF } from "@/services/pagos";
import { listFacturas } from "@/services/facturas"; // para elegir factura y ver saldo

const fmt = "YYYY-MM-DD";

export default function GestionarPagos() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [metodo, setMetodo] = useState();
  const [estado, setEstado] = useState();
  const [range, setRange] = useState();

  // facturas para selector
  const [factOpts, setFactOpts] = useState([]);
  const [factLoading, setFactLoading] = useState(false);
  const [saldoFactura, setSaldoFactura] = useState(null);

  async function fetchFacturas(term = "") {
    setFactLoading(true);
    try {
      const res = await listFacturas({ page: 1, page_size: 20, search: term || undefined });
      const items = res?.results || [];
      setFactOpts(items.map(f => ({
        value: f.id, label: f.numero ? `#${f.numero} — ${f.cliente_nombre || ""}` : `Factura ${f.id}`,
        saldo: (f.total ?? 0) - ((f.pagado ?? 0) || 0), numero: f.numero
      })));
    } catch { setFactOpts([]); }
    finally { setFactLoading(false); }
  }

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Factura", dataIndex: "factura_numero", width: 140, render: (v, r) => v || (r.factura_id ? `#${r.factura_id}` : "-") },
    { title: "Fecha", dataIndex: "fecha", width: 120, render: v => v || "-" },
    { title: "Monto", dataIndex: "monto", width: 120, render: v => (Number(v || 0)).toFixed(2) },
    { title: "Método", dataIndex: "metodo", width: 150, render: v => <Tag color={metodoColor(v)}>{v}</Tag> },
    { title: "Ref.", dataIndex: "referencia", render: v => v || "-" },
    { title: "Estado", dataIndex: "estado", width: 140, render: v => <Tag color={estadoColor(v)}>{v}</Tag> },
    {
      title: "Acción", width: 360,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "CONFIRMADO" && <Typography.Link onClick={() => cambiarEstado(r, "CONFIRMADO")}>Confirmar</Typography.Link>}
          {r.estado !== "ANULADO" && <Typography.Link onClick={() => cambiarEstado(r, "ANULADO")}>Anular</Typography.Link>}
          <Typography.Link onClick={() => descargarRecibo(r)}>Recibo</Typography.Link>
          <Popconfirm title="¿Eliminar pago?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
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

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (metodo) params.metodo = metodo;
    if (estado) params.estado = estado;
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
      message.error("No se pudieron cargar los pagos");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchFacturas(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  function openCreate() {
    setEditing(null);
    setSaldoFactura(null);
    form.resetFields();
    form.setFieldsValue({
      fecha: dayjs(),
      moneda: "BOB",
      metodo: "EFECTIVO",
      estado: "CONFIRMADO",
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setSaldoFactura(row.saldo_pendiente ?? null);
    form.setFieldsValue({
      factura_id: row.factura_id,
      fecha: row.fecha ? dayjs(row.fecha) : null,
      monto: row.monto,
      moneda: row.moneda,
      metodo: row.metodo,
      referencia: row.referencia,
      estado: row.estado,
      observacion: row.observacion,
    });
    if (row.factura_id && !factOpts.find(f => f.value === row.factura_id)) {
      setFactOpts(prev => [{ value: row.factura_id, label: row.factura_numero || `Factura ${row.factura_id}`, saldo: row.saldo_pendiente ?? null }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha: v.fecha ? v.fecha.format(fmt) : undefined,
      };
      if (editing) {
        await updatePago(editing.id, payload);
        message.success("Pago actualizado");
      } else {
        await createPago(payload);
        message.success("Pago registrado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function cambiarEstado(row, nuevo) {
    try {
      await setEstadoPago(row.id, nuevo);
      message.success(`Estado: ${nuevo}`);
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
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

  // al elegir factura, mostrar saldo si viene del servicio de facturas
  function onFacturaChange(val, option) {
    if (!val) { setSaldoFactura(null); return; }
    setSaldoFactura(option?.saldo ?? null);
    form.setFieldsValue({
      monto: option?.saldo ?? form.getFieldValue("monto"),
    });
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
          style={{ width: 180 }}
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
          style={{ width: 180 }}
          options={[
            { value: "CONFIRMADO", label: "Confirmado" },
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "ANULADO", label: "Anulado" },
          ]}
        />
        <DatePicker.RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setMetodo(); setEstado(); setRange(); fetchData(1, pag.pageSize); }}>Limpiar</Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Pago
      </Button>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
      />

      <Modal
        title={editing ? "Editar pago" : "Registrar pago"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="factura_id" label="Factura" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Select
                showSearch
                allowClear
                placeholder="Buscar factura"
                onSearch={(t) => fetchFacturas(t)}
                filterOption={false}
                loading={factLoading}
                options={factOpts}
                onChange={onFacturaChange}
              />
            </Form.Item>
            <Form.Item name="fecha" label="Fecha" style={{ width: 220 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
          </Space.Compact>

          {saldoFactura != null && (
            <Typography.Text type="secondary">
              Saldo pendiente de la factura: <b>{Number(saldoFactura).toFixed(2)}</b>
            </Typography.Text>
          )}

          <Space.Compact block>
            <Form.Item name="monto" label="Monto" style={{ width: 220 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="moneda" label="Moneda" style={{ width: 140 }}>
              <Select options={[{ value: "BOB", label: "BOB" }, { value: "USD", label: "USD" }]} />
            </Form.Item>
            <Form.Item name="metodo" label="Método" style={{ width: 220 }}>
              <Select
                options={[
                  { value: "EFECTIVO", label: "Efectivo" },
                  { value: "TARJETA", label: "Tarjeta" },
                  { value: "TRANSFERENCIA", label: "Transferencia" },
                  { value: "QR", label: "QR" },
                ]}
              />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="referencia" label="Referencia / voucher" style={{ flex: 1 }}>
              <Input placeholder="N° operación / voucher / último 6" />
            </Form.Item>
            <Form.Item name="estado" label="Estado" style={{ width: 220 }}>
              <Select
                options={[
                  { value: "CONFIRMADO", label: "Confirmado" },
                  { value: "PENDIENTE", label: "Pendiente" },
                  { value: "ANULADO", label: "Anulado" },
                ]}
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="observacion" label="Observación">
            <Input.TextArea rows={3} placeholder="Notas internas" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
