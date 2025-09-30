// src/pages/Comunidad y vigilancia/Incidentes/gestionarincidentes.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form, Input,
  message, Tag, Select, DatePicker
} from "antd";
import dayjs from "dayjs";
import {
  listIncidentes, createIncidente, updateIncidente, deleteIncidente, setEstadoIncidente
} from "@/services/incidentes";
import { searchUnidades } from "@/services/unidades";

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const fmtDate = "YYYY-MM-DD";

const ESTADOS = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_PROGRESO", label: "En progreso" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CERRADO", label: "Cerrado" },
];
const PRIORIZ = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

export default function GestionarIncidentes() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState();
  const [prioridad, setPrioridad] = useState();
  const [unidad, setUnidad] = useState();
  const [range, setRange] = useState();

  // unidades para select
  const [uniOpts, setUniOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  async function fetchUnidades(term = "") {
    setUniLoading(true);
    try {
      const items = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts(items.map(u => ({ value: u.id, label: u.label })));
    } catch { /* noop */ }
    finally { setUniLoading(false); }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize, ordering: "-id" };
    if (q?.trim()) params.search = q.trim();
    if (estado) params.estado = estado;
    if (prioridad) params.prioridad = prioridad;
    if (unidad) params.unidad = unidad;
    if (range && range.length === 2) {
      params.fecha_desde = range[0].format(fmtDate);
      params.fecha_hasta = range[1].format(fmtDate);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listIncidentes(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar los incidentes");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchUnidades(); fetchData(1, pag.pageSize); /* eslint-disable-next-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Título", dataIndex: "titulo" },
    { title: "Categoría", dataIndex: "categoria", render: v => v || "-" },
    { title: "Prioridad", dataIndex: "prioridad", render: v => <Tag color={prioColor(v)}>{v || "-"}</Tag>, width: 110 },
    { title: "Unidad", dataIndex: "unidad", render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-", width: 120 },
    { title: "Estado", dataIndex: "estado", render: v => <Tag color={estadoColor(v)}>{v}</Tag>, width: 130 },
    { title: "F. Reporte", dataIndex: "fecha_reporte", render: v => v || "-", width: 130 },
    { title: "F. Resolución", dataIndex: "fecha_resolucion", render: v => v || "-", width: 140 },
    {
      title: "Acción", width: 360,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "EN_PROGRESO" && <Typography.Link onClick={() => cambiarEstado(r, "EN_PROGRESO")}>En progreso</Typography.Link>}
          {r.estado !== "RESUELTO" && <Typography.Link onClick={() => cambiarEstado(r, "RESUELTO")}>Resolver</Typography.Link>}
          {r.estado !== "CERRADO" && <Typography.Link onClick={() => cambiarEstado(r, "CERRADO")}>Cerrar</Typography.Link>}
          <Popconfirm title="¿Eliminar incidente?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    },
  ], []);

  function prioColor(v) {
    switch ((v || "").toUpperCase()) {
      case "CRITICA": return "volcano";
      case "ALTA": return "red";
      case "MEDIA": return "gold";
      case "BAJA": return "green";
      default: return "default";
    }
  }
  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "ABIERTO": return "default";
      case "EN_PROGRESO": return "blue";
      case "RESUELTO": return "green";
      case "CERRADO": return "purple";
      default: return "default";
    }
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      prioridad: "MEDIA",
      estado: "ABIERTO",
      fecha_reporte: dayjs(),
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      titulo: row.titulo,
      descripcion: row.descripcion,
      categoria: row.categoria,
      prioridad: row.prioridad,
      estado: row.estado,
      unidad: row.unidad,
      reportado_por: row.reportado_por,
      asignado_a: row.asignado_a,
      fecha_reporte: row.fecha_reporte ? dayjs(row.fecha_reporte) : null,
      fecha_resolucion: row.fecha_resolucion ? dayjs(row.fecha_resolucion) : null,
      evidencia_url: row.evidencia_url,
      notas: row.notas,
    });
    if (row.unidad && !uniOpts.find(o => o.value === row.unidad)) {
      setUniOpts(prev => [{ value: row.unidad, label: String(row.unidad) }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha_reporte: v.fecha_reporte ? v.fecha_reporte.format(fmtDate) : null,
        fecha_resolucion: v.fecha_resolucion ? v.fecha_resolucion.format(fmtDate) : null,
      };
      if (editing) {
        await updateIncidente(editing.id, payload);
        message.success("Incidente actualizado");
      } else {
        await createIncidente(payload);
        message.success("Incidente creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function cambiarEstado(row, nuevo) {
    try {
      const extra = {};
      if (nuevo === "RESUELTO" && !row.fecha_resolucion) {
        extra.fecha_resolucion = dayjs().format(fmtDate);
      }
      await setEstadoIncidente(row.id, nuevo, extra);
      message.success(`Estado: ${nuevo}`);
      fetchData(pag.current, pag.pageSize);
    } catch (e) { message.error("No se pudo cambiar el estado"); }
  }

  async function handleDelete(id) {
    try {
      await deleteIncidente(id);
      message.success("Eliminado");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar título / descripción"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 280 }}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={estado}
          onChange={setEstado}
          options={ESTADOS}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Prioridad"
          allowClear
          value={prioridad}
          onChange={setPrioridad}
          options={PRIORIZ}
          style={{ width: 160 }}
        />
        <Select
          showSearch
          placeholder="Unidad"
          allowClear
          value={unidad}
          onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)}
          filterOption={false}
          loading={uniLoading}
          options={uniOpts}
          style={{ minWidth: 220 }}
        />
        <RangePicker value={range} onChange={setRange} format={fmtDate} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setEstado(); setPrioridad(); setUnidad(); setRange(); fetchData(1, pag.pageSize); }}>Limpiar</Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Incidente
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
        title={editing ? "Editar Incidente" : "Nuevo Incidente"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="titulo"
            label="Título"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input placeholder="Ej: Fuga de agua en torre B" />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={4} placeholder="Detalles del incidente…" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="categoria" label="Categoría" style={{ width: 220 }}>
              <Select allowClear placeholder="Elige o escribe…" options={[
                { value: "Agua", label: "Agua" },
                { value: "Electricidad", label: "Electricidad" },
                { value: "Seguridad", label: "Seguridad" },
                { value: "Limpieza", label: "Limpieza" },
                { value: "Otro", label: "Otro" },
              ]} />
            </Form.Item>

            <Form.Item name="prioridad" label="Prioridad" style={{ width: 180 }}>
              <Select options={PRIORIZ} />
            </Form.Item>

            <Form.Item name="estado" label="Estado" style={{ width: 180 }}>
              <Select options={ESTADOS} />
            </Form.Item>

            <Form.Item name="unidad" label="Unidad" style={{ flex: 1 }}>
              <Select
                showSearch
                allowClear
                placeholder="Buscar unidad"
                onSearch={(t) => fetchUnidades(t)}
                filterOption={false}
                loading={uniLoading}
                options={uniOpts}
              />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha_reporte" label="Fecha reporte" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmtDate} />
            </Form.Item>
            <Form.Item name="fecha_resolucion" label="Fecha resolución" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmtDate} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="evidencia_url" label="URL evidencia (foto/archivo)" style={{ flex: 1 }}>
              <Input placeholder="http(s)://…" />
            </Form.Item>
            <Form.Item name="reportado_por" label="Reportado por" style={{ width: 240 }}>
              <Input placeholder="Nombre / Id usuario" />
            </Form.Item>
            <Form.Item name="asignado_a" label="Asignado a" style={{ width: 240 }}>
              <Input placeholder="Técnico / Proveedor" />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="notas" label="Notas">
            <TextArea rows={3} placeholder="Seguimiento interno, comentarios…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
