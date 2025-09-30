// src/pages/Finanzas/Multas/gestionarmultas.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker, Tooltip
} from "antd";
import dayjs from "dayjs";
import {
  listMultas, createMulta, updateMulta, deleteMulta, setEstadoMulta, generarFacturaDeMulta
} from "@/services/multas";
import { searchUnidades } from "@/services/unidades";
import { listResidentes } from "@/services/residentes";   // si no lo tienes, cambia por tu servicio de personas
import { listFacturas } from "@/services/facturas";       // para mostrar enlace si existe

const fmt = "YYYY-MM-DD";

export default function GestionarMultas() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState();
  const [tipo, setTipo] = useState();
  const [unidad, setUnidad] = useState();
  const [residente, setResidente] = useState();
  const [range, setRange] = useState();

  // selects
  const [uniOpts, setUniOpts] = useState([]);
  const [resOpts, setResOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [resLoading, setResLoading] = useState(false);

  async function fetchUnidades(term = "") {
    try {
      setUniLoading(true);
      const res = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((res || []).map((u) => ({ value: u.id, label: u.label ?? String(u.id) })));
    } catch { setUniOpts([]); }
    finally { setUniLoading(false); }
  }
  async function fetchResidentes(term = "") {
    try {
      setResLoading(true);
      const res = await listResidentes?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = res?.results || res || [];
      setResOpts(arr.map((r) => ({ value: r.id ?? r.uuid, label: r.nombre ?? r.nombre_completo ?? String(r.id) })));
    } catch { setResOpts([]); }
    finally { setResLoading(false); }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (estado) params.estado = estado;
    if (tipo) params.tipo = tipo;
    if (unidad) params.unidad = unidad;
    if (residente) params.residente = residente;
    if (range?.length === 2) {
      params.desde = range[0].format(fmt);
      params.hasta = range[1].format(fmt);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listMultas(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) { console.error(e); message.error("No se pudieron cargar las multas"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUnidades(); fetchResidentes(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Código", dataIndex: "codigo", width: 120, render: v => v || "-" },
    { title: "Motivo", dataIndex: "motivo", ellipsis: true },
    { title: "Tipo", dataIndex: "tipo", width: 130 },
    { title: "Unidad", dataIndex: "unidad", width: 120, render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Residente", dataIndex: "residente", width: 180, render: v => v || "-" },
    { title: "Fecha", dataIndex: "fecha", width: 120, render: v => v || "-" },
    { title: "Vence", dataIndex: "vencimiento", width: 120, render: v => v || "-" },
    { title: "Monto", dataIndex: "monto", width: 120, align: "right", render: v => Number(v || 0).toFixed(2) },
    {
      title: "Estado", dataIndex: "estado", width: 130,
      render: v => <Tag color={estadoColor(v)}>{v}</Tag>
    },
    {
      title: "Acción", width: 420,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "PAGADA" && <Typography.Link onClick={() => cambiarEstado(r, "PAGADA")}>Marcar pagada</Typography.Link>}
          {r.estado !== "ANULADA" && <Typography.Link onClick={() => cambiarEstado(r, "ANULADA")}>Anular</Typography.Link>}
          <Tooltip title="Si tu backend lo soporta">
            <Typography.Link onClick={() => crearFactura(r)}>Generar factura</Typography.Link>
          </Tooltip>
          <Popconfirm title="¿Eliminar multa?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "PENDIENTE": return "gold";
      case "PAGADA": return "green";
      case "ANULADA": return "red";
      default: return "default";
    }
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      fecha: dayjs(),
      moneda: "BOB",
      estado: "PENDIENTE",
      interes_dia: 0,
      tipo: "GENERAL",
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      codigo: row.codigo,
      motivo: row.motivo,
      tipo: row.tipo,
      monto: row.monto,
      moneda: row.moneda,
      estado: row.estado,
      fecha: row.fecha ? dayjs(row.fecha) : null,
      vencimiento: row.vencimiento ? dayjs(row.vencimiento) : null,
      interes_dia: row.interes_dia,
      unidad: row.unidad,
      residente: row.residente,
      observacion: row.observacion,
      factura_id: row.factura_id,
    });
    if (row.unidad && !uniOpts.find(o => o.value === row.unidad)) {
      setUniOpts(prev => [{ value: row.unidad, label: String(row.unidad) }, ...prev]);
    }
    if (row.residente && !resOpts.find(o => o.value === row.residente)) {
      setResOpts(prev => [{ value: row.residente, label: String(row.residente) }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha: v.fecha ? v.fecha.format(fmt) : undefined,
        vencimiento: v.vencimiento ? v.vencimiento.format(fmt) : undefined,
      };
      if (editing) {
        await updateMulta(editing.id, payload);
        message.success("Multa actualizada");
      } else {
        await createMulta(payload);
        message.success("Multa creada");
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
      await setEstadoMulta(row.id, nuevo);
      message.success(`Estado: ${nuevo}`);
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
  }

  async function crearFactura(row) {
    try {
      const res = await generarFacturaDeMulta(row.id); // debe existir en tu backend
      message.success(`Factura creada ${res?.numero || res?.id || ""}`);
      fetchData(pag.current, pag.pageSize);
    } catch { message.info("La API no soporta generar factura para multas"); }
  }

  async function handleDelete(id) {
    try {
      await deleteMulta(id);
      message.success("Eliminada");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  // cálculo de mora simple (visual) — opcional
  const moraInfo = useMemo(() => {
    const v = form.getFieldValue("vencimiento");
    const interes = Number(form.getFieldValue("interes_dia") || 0);
    const monto = Number(form.getFieldValue("monto") || 0);
    if (!v || !interes || !monto) return null;
    const dias = Math.max(0, dayjs().startOf("day").diff(v.startOf("day"), "day"));
    const mora = +(monto * (interes / 100) * dias).toFixed(2);
    return { dias, mora, total: +(monto + mora).toFixed(2) };
  }, [form]);

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar motivo / código"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={estado}
          onChange={setEstado}
          style={{ width: 170 }}
          options={[
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "PAGADA", label: "Pagada" },
            { value: "ANULADA", label: "Anulada" },
          ]}
        />
        <Select
          placeholder="Tipo"
          allowClear
          value={tipo}
          onChange={setTipo}
          style={{ width: 170 }}
          options={[
            { value: "GENERAL", label: "General" },
            { value: "RUIDO", label: "Ruido" },
            { value: "ESTACIONAMIENTO", label: "Estacionamiento" },
            { value: "LIMPIEZA", label: "Limpieza" },
          ]}
        />
        <Select
          showSearch allowClear placeholder="Unidad"
          value={unidad} onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
          style={{ minWidth: 220 }} options={uniOpts}
        />
        <Select
          showSearch allowClear placeholder="Residente"
          value={residente} onChange={setResidente}
          onSearch={(t) => fetchResidentes(t)} filterOption={false} loading={resLoading}
          style={{ minWidth: 240 }} options={resOpts}
        />
        <DatePicker.RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setEstado(); setTipo(); setUnidad(); setResidente(); setRange(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Multa
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
        title={editing ? "Editar multa" : "Nueva multa"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={820}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="codigo" label="Código" style={{ width: 220 }}>
              <Input placeholder="Opcional" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select options={[
                { value: "GENERAL", label: "General" },
                { value: "RUIDO", label: "Ruido" },
                { value: "ESTACIONAMIENTO", label: "Estacionamiento" },
                { value: "LIMPIEZA", label: "Limpieza" },
              ]}/>
            </Form.Item>
            <Form.Item name="estado" label="Estado" style={{ width: 220 }}>
              <Select options={[
                { value: "PENDIENTE", label: "Pendiente" },
                { value: "PAGADA", label: "Pagada" },
                { value: "ANULADA", label: "Anulada" },
              ]}/>
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="motivo" label="Motivo / descripción"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input.TextArea rows={3} placeholder="Describe la infracción" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="monto" label="Monto" style={{ width: 220 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="moneda" label="Moneda" style={{ width: 150 }}>
              <Select options={[{ value: "BOB", label: "BOB" }, { value: "USD", label: "USD" }]} />
            </Form.Item>
            <Form.Item name="interes_dia" label="% interés/día (mora)" style={{ width: 220 }}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha" label="Fecha" style={{ width: 220 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="vencimiento" label="Vencimiento" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="unidad" label="Unidad" style={{ width: 240 }}>
              <Select showSearch allowClear placeholder="Buscar unidad"
                onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
                options={uniOpts}/>
            </Form.Item>
          </Space.Compact>

          <Form.Item name="residente" label="Residente">
            <Select showSearch allowClear placeholder="Buscar residente"
              onSearch={(t) => fetchResidentes(t)} filterOption={false} loading={resLoading}
              options={resOpts}/>
          </Form.Item>

          {moraInfo && (
            <Typography.Paragraph type="secondary">
              Mora estimada: {moraInfo.mora.toFixed(2)} por {moraInfo.dias} día(s) — Total probable: <b>{moraInfo.total.toFixed(2)}</b>
            </Typography.Paragraph>
          )}

          <Form.Item name="observacion" label="Observación">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
