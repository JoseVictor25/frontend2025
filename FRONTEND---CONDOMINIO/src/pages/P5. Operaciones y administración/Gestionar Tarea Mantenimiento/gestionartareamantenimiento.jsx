// src/pages/Mantenimiento/Tareas/gestionartareas.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker, Tooltip
} from "antd";
import dayjs from "dayjs";
import {
  listTareas, createTarea, updateTarea, deleteTarea,
  setEstadoTarea, startTarea, completeTarea, cancelTarea
} from "@/services/tareas_mantenimiento";
import { listServicios } from "@/services/servicios";
import { searchUnidades } from "@/services/unidades";
import { listAreas } from "@/services/areas_comunes";
// Si tienes "equipos" o "usuarios", agrega sus servicios de lookup
// import { listEquipos } from "@/services/equipos";
import { listPersonal } from "@/services/personal";

const { RangePicker } = DatePicker;
const fmt = "YYYY-MM-DD";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA"].map(v => ({ value: v, label: v }));
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "CRITICA"].map(v => ({ value: v, label: v }));
const RECURRENCIA = ["NUNCA", "DIARIA", "SEMANAL", "MENSUAL"].map(v => ({ value: v, label: v }));

export default function GestionarTareas() {
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
  const [servicio, setServicio] = useState();
  const [responsable, setResponsable] = useState();
  const [unidad, setUnidad] = useState();
  const [area, setArea] = useState();
  const [range, setRange] = useState();

  // lookups
  const [servOpts, setServOpts] = useState([]);
  const [respOpts, setRespOpts] = useState([]);
  const [uniOpts, setUniOpts] = useState([]);
  const [areaOpts, setAreaOpts] = useState([]);
  const [lookLoading, setLookLoading] = useState(false);

  async function fetchLookups(term = "") {
    setLookLoading(true);
    try {
      const s = await listServicios?.({ page: 1, page_size: 20, search: term || undefined });
      const sItems = s?.results || s || [];
      setServOpts(sItems.map(x => ({ value: x.id, label: x.nombre || `Serv. ${x.id}` })));
    } catch {}
    try {
      const p = await listPersonal?.({ page: 1, page_size: 20, search: term || undefined });
      const pItems = p?.results || p || [];
      setRespOpts(pItems.map(x => ({ value: x.id, label: `${x.nombres || ""} ${x.apellidos || ""}`.trim() || `Pers. ${x.id}` })));
    } catch {}
    try {
      const u = await searchUnidades?.({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((u || []).map(x => ({ value: x.id, label: x.label ?? String(x.id) })));
    } catch {}
    try {
      const a = await listAreas?.({ page: 1, page_size: 20, search: term || undefined });
      const aItems = a?.results || a || [];
      setAreaOpts(aItems.map(x => ({ value: x.id, label: x.nombre || `Área ${x.id}` })));
    } catch {}
    setLookLoading(false);
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (estado) params.estado = estado;
    if (prioridad) params.prioridad = prioridad;
    if (servicio) params.servicio = servicio;
    if (responsable) params.responsable = responsable;
    if (unidad) params.unidad = unidad;
    if (area) params.area = area;
    if (range?.length === 2) {
      params.desde = range[0].format(fmt);
      params.hasta = range[1].format(fmt);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listTareas(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar las tareas");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchLookups(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80, render: v => (v ? String(v).slice(0,8) + "…" : "-") },
    { title: "Código", dataIndex: "codigo", width: 120, render: v => v || "-" },
    { title: "Título", dataIndex: "titulo", ellipsis: true },
    { title: "Prioridad", dataIndex: "prioridad", width: 120, render: v => <Tag color={prioColor(v)}>{v || "-"}</Tag> },
    { title: "Estado", dataIndex: "estado", width: 140, render: v => <Tag color={estadoColor(v)}>{v || "-"}</Tag> },
    { title: "Resp.", dataIndex: "responsable", width: 180, render: v => v || "-" },
    { title: "Servicio", dataIndex: "servicio", width: 140, render: v => v || "-" },
    { title: "Prog.", dataIndex: "fecha_programada", width: 120, render: v => v || "-" },
    { title: "Vence", dataIndex: "fecha_limite", width: 120, render: v => v || "-" },
    {
      title: "Acción", width: 480,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "EN_PROCESO" && r.estado !== "COMPLETADA" && r.estado !== "CANCELADA" &&
            <Typography.Link onClick={() => start(r)}>Iniciar</Typography.Link>}
          {r.estado !== "COMPLETADA" && r.estado !== "CANCELADA" &&
            <Typography.Link onClick={() => complete(r)}>Completar</Typography.Link>}
          {r.estado !== "CANCELADA" &&
            <Typography.Link onClick={() => cancel(r)}>Cancelar</Typography.Link>}
          <Popconfirm title="¿Eliminar tarea?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function prioColor(v) {
    switch ((v || "").toUpperCase()) {
      case "ALTA": return "orange";
      case "CRITICA": return "red";
      case "BAJA": return "green";
      default: return "blue";
    }
  }
  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "PENDIENTE": return "gold";
      case "EN_PROCESO": return "blue";
      case "COMPLETADA": return "green";
      case "CANCELADA": return "red";
      default: return "default";
    }
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      prioridad: "MEDIA",
      estado: "PENDIENTE",
      recurrencia: "NUNCA",
      fecha_programada: dayjs(),
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      codigo: row.codigo,
      titulo: row.titulo,
      descripcion: row.descripcion,
      estado: row.estado,
      prioridad: row.prioridad,
      responsable: row.responsable,
      servicio: row.servicio,
      equipo: row.equipo,
      unidad: row.unidad,
      area: row.area,
      fecha_programada: row.fecha_programada ? dayjs(row.fecha_programada) : null,
      fecha_limite: row.fecha_limite ? dayjs(row.fecha_limite) : null,
      fecha_inicio: row.fecha_inicio ? dayjs(row.fecha_inicio) : null,
      fecha_cierre: row.fecha_cierre ? dayjs(row.fecha_cierre) : null,
      recurrencia: row.recurrencia || "NUNCA",
      estimado_horas: row.estimado_horas,
      costo_estimado: row.costo_estimado,
      notas: row.notas,
    });
    // asegurar que existan opciones visibles
    if (row.servicio && !servOpts.find(o => o.value === row.servicio)) {
      setServOpts(prev => [{ value: row.servicio, label: String(row.servicio) }, ...prev]);
    }
    if (row.responsable && !respOpts.find(o => o.value === row.responsable)) {
      setRespOpts(prev => [{ value: row.responsable, label: String(row.responsable) }, ...prev]);
    }
    if (row.unidad && !uniOpts.find(o => o.value === row.unidad)) {
      setUniOpts(prev => [{ value: row.unidad, label: String(row.unidad) }, ...prev]);
    }
    if (row.area && !areaOpts.find(o => o.value === row.area)) {
      setAreaOpts(prev => [{ value: row.area, label: String(row.area) }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha_programada: v.fecha_programada ? v.fecha_programada.format(fmt) : undefined,
        fecha_limite: v.fecha_limite ? v.fecha_limite.format(fmt) : undefined,
        fecha_inicio: v.fecha_inicio ? v.fecha_inicio.format(fmt) : undefined,
        fecha_cierre: v.fecha_cierre ? v.fecha_cierre.format(fmt) : undefined,
      };
      if (editing) {
        await updateTarea(editing.id, payload);
        message.success("Tarea actualizada");
      } else {
        await createTarea(payload);
        message.success("Tarea creada");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function start(row)    { try { await startTarea(row.id);    message.success("Tarea iniciada");   fetchData(pag.current, pag.pageSize); } catch { message.error("No se pudo iniciar"); } }
  async function complete(row) { try { await completeTarea(row.id); message.success("Tarea completada"); fetchData(pag.current, pag.pageSize); } catch { message.error("No se pudo completar"); } }
  async function cancel(row)   { try { await cancelTarea(row.id);   message.success("Tarea cancelada");  fetchData(pag.current, pag.pageSize); } catch { message.error("No se pudo cancelar"); } }

  async function handleDelete(id) {
    try {
      await deleteTarea(id);
      message.success("Eliminada");
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
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} style={{ width: 170 }} options={ESTADOS} />
        <Select placeholder="Prioridad" allowClear value={prioridad} onChange={setPrioridad} style={{ width: 170 }} options={PRIORIDADES} />
        <Select showSearch allowClear placeholder="Servicio" value={servicio} onChange={setServicio}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 220 }} options={servOpts} />
        <Select showSearch allowClear placeholder="Responsable" value={responsable} onChange={setResponsable}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 220 }} options={respOpts} />
        <Select showSearch allowClear placeholder="Unidad" value={unidad} onChange={setUnidad}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={uniOpts} />
        <Select showSearch allowClear placeholder="Área común" value={area} onChange={setArea}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={areaOpts} />
        <RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setEstado(); setPrioridad(); setServicio(); setResponsable(); setUnidad(); setArea(); setRange(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva tarea
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
        title={editing ? "Editar tarea" : "Nueva tarea"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={920}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="codigo" label="Código" style={{ width: 200 }}>
              <Input placeholder="Opcional" />
            </Form.Item>
            <Form.Item name="titulo" label="Título" style={{ flex: 1 }} rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Ej: Lubricar motor de ascensor B" />
            </Form.Item>
            <Form.Item name="prioridad" label="Prioridad" style={{ width: 200 }}>
              <Select options={PRIORIDADES} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Pasos, materiales, medidas de seguridad, etc." />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="servicio" label="Servicio" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={servOpts} />
            </Form.Item>
            <Form.Item name="responsable" label="Responsable" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={respOpts} />
            </Form.Item>
            <Form.Item name="recurrencia" label="Recurrencia" style={{ width: 220 }}>
              <Select options={RECURRENCIA} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha_programada" label="Fecha programada" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="fecha_limite" label="Fecha límite" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="estimado_horas" label="Horas estimadas" style={{ width: 200 }}>
              <InputNumber min={0} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="costo_estimado" label="Costo estimado" style={{ width: 200 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="unidad" label="Unidad" style={{ width: 240 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={uniOpts} />
            </Form.Item>
            <Form.Item name="area" label="Área común" style={{ width: 240 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={areaOpts} />
            </Form.Item>
            <Form.Item name="estado" label="Estado" style={{ width: 220 }}>
              <Select options={ESTADOS} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
