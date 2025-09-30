// src/pages/Mantenimiento/Reparaciones/gestionarreparaciones.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker, Tooltip
} from "antd";
import dayjs from "dayjs";
import {
  listReparaciones, createReparacion, updateReparacion, deleteReparacion, setEstadoReparacion
} from "@/services/reparaciones";
import { searchUnidades } from "@/services/unidades";
import { listIncidentes } from "@/services/incidentes";     // si tu backend lo soporta
import { listAreas } from "@/services/areas_comunes";       // para vincular a un área común

const fmt = "YYYY-MM-DD";

export default function GestionarReparaciones() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState();
  const [categoria, setCategoria] = useState();
  const [proveedor, setProveedor] = useState();
  const [unidad, setUnidad] = useState();
  const [range, setRange] = useState();

  // selects
  const [uniOpts, setUniOpts] = useState([]);
  const [incOpts, setIncOpts] = useState([]);
  const [areaOpts, setAreaOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  async function fetchUnidades(term = "") {
    setUniLoading(true);
    try {
      const res = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((res || []).map((u) => ({ value: u.id, label: u.label ?? String(u.id) })));
    } catch { setUniOpts([]); }
    finally { setUniLoading(false); }
  }
  async function fetchIncidentes(term = "") {
    try {
      const res = await listIncidentes?.({ page: 1, page_size: 20, search: term || undefined });
      const items = res?.results || res || [];
      setIncOpts(items.map(i => ({ value: i.id, label: i.titulo || `Incidente ${i.id}` })));
    } catch { setIncOpts([]); }
  }
  async function fetchAreas(term = "") {
    try {
      const res = await listAreas?.({ page: 1, page_size: 20, search: term || undefined });
      const items = res?.results || res || [];
      setAreaOpts(items.map(a => ({ value: a.id, label: a.nombre || `Área ${a.id}` })));
    } catch { setAreaOpts([]); }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (estado) params.estado = estado;
    if (categoria) params.categoria = categoria;
    if (proveedor) params.proveedor = proveedor;
    if (unidad) params.unidad = unidad;
    if (range?.length === 2) {
      params.desde = range[0].format(fmt);
      params.hasta = range[1].format(fmt);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listReparaciones(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) { console.error(e); message.error("No se pudieron cargar las reparaciones"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUnidades(); fetchIncidentes(); fetchAreas(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Código", dataIndex: "codigo", width: 120, render: v => v || "-" },
    { title: "Título", dataIndex: "titulo", ellipsis: true },
    { title: "Categoría", dataIndex: "categoria", width: 140, render: v => v || "-" },
    { title: "Proveedor", dataIndex: "proveedor", width: 160, render: v => v || "-" },
    { title: "Unidad", dataIndex: "unidad", width: 120, render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Fecha", dataIndex: "fecha", width: 120, render: v => v || "-" },
    { title: "Costo total", dataIndex: "total", width: 140, align: "right", render: v => Number(v || 0).toFixed(2) },
    {
      title: "Estado", dataIndex: "estado", width: 140,
      render: v => <Tag color={estadoColor(v)}>{v}</Tag>
    },
    {
      title: "Acción", width: 420,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "EN_PROCESO" && <Typography.Link onClick={() => cambiarEstado(r, "EN_PROCESO")}>En proceso</Typography.Link>}
          {r.estado !== "COMPLETADO" && <Typography.Link onClick={() => cambiarEstado(r, "COMPLETADO")}>Completar</Typography.Link>}
          {r.estado !== "ANULADO" && <Typography.Link onClick={() => cambiarEstado(r, "ANULADO")}>Anular</Typography.Link>}
          <Popconfirm title="¿Eliminar reparación?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function estadoColor(v) {
    switch ((v || "").toUpperCase()) {
      case "PENDIENTE": return "gold";
      case "EN_PROCESO": return "blue";
      case "COMPLETADO": return "green";
      case "ANULADO": return "red";
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
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_otros: 0,
      impuesto: 0,
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      codigo: row.codigo,
      titulo: row.titulo,
      descripcion: row.descripcion,
      categoria: row.categoria,
      estado: row.estado,
      proveedor: row.proveedor,
      unidad: row.unidad,
      area: row.area,
      incidente: row.incidente,
      fecha: row.fecha ? dayjs(row.fecha) : null,
      fecha_cierre: row.fecha_cierre ? dayjs(row.fecha_cierre) : null,

      costo_materiales: row.costo_materiales,
      costo_mano_obra: row.costo_mano_obra,
      costo_otros: row.costo_otros,
      impuesto: row.impuesto,
      total: row.total,

      moneda: row.moneda,
      adjunto_url: row.adjunto_url,
      notas: row.notas,
    });
    if (row.unidad && !uniOpts.find(o => o.value === row.unidad)) {
      setUniOpts(prev => [{ value: row.unidad, label: String(row.unidad) }, ...prev]);
    }
    setModalOpen(true);
  }

  function calcTotal(values) {
    const m = Number(values?.costo_materiales || 0);
    const l = Number(values?.costo_mano_obra || 0);
    const o = Number(values?.costo_otros || 0);
    const t = Number(values?.impuesto || 0); // monto, no %
    return +(m + l + o + t).toFixed(2);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha: v.fecha ? v.fecha.format(fmt) : undefined,
        fecha_cierre: v.fecha_cierre ? v.fecha_cierre.format(fmt) : undefined,
        total: calcTotal(v),
      };
      if (editing) {
        await updateReparacion(editing.id, payload);
        message.success("Reparación actualizada");
      } else {
        await createReparacion(payload);
        message.success("Reparación creada");
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
      await setEstadoReparacion(row.id, nuevo);
      message.success(`Estado: ${nuevo}`);
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
  }

  async function handleDelete(id) {
    try {
      await deleteReparacion(id);
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
          placeholder="Buscar título / proveedor"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 260 }}
        />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado}
          style={{ width: 170 }}
          options={[
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "EN_PROCESO", label: "En proceso" },
            { value: "COMPLETADO", label: "Completado" },
            { value: "ANULADO", label: "Anulado" },
          ]}
        />
        <Select placeholder="Categoría" allowClear value={categoria} onChange={setCategoria}
          style={{ width: 170 }}
          options={[
            { value: "ELECTRICIDAD", label: "Electricidad" },
            { value: "AGUA", label: "Agua" },
            { value: "ALBAÑILERIA", label: "Albañilería" },
            { value: "PINTURA", label: "Pintura" },
            { value: "OTRO", label: "Otro" },
          ]}
        />
        <Input placeholder="Proveedor" allowClear value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={{ width: 200 }} />
        <Select
          showSearch allowClear placeholder="Unidad"
          value={unidad} onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
          style={{ minWidth: 220 }} options={uniOpts}
        />
        <DatePicker.RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setEstado(); setCategoria(); setProveedor(); setUnidad(); setRange(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva reparación
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
        title={editing ? "Editar reparación" : "Nueva reparación"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="codigo" label="Código" style={{ width: 180 }}>
              <Input placeholder="Opcional" />
            </Form.Item>
            <Form.Item name="titulo" label="Título" style={{ flex: 1 }} rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Ej: Cambio de luminaria en lobby" />
            </Form.Item>
            <Form.Item name="categoria" label="Categoría" style={{ width: 220 }}>
              <Select options={[
                { value: "ELECTRICIDAD", label: "Electricidad" },
                { value: "AGUA", label: "Agua" },
                { value: "ALBAÑILERIA", label: "Albañilería" },
                { value: "PINTURA", label: "Pintura" },
                { value: "OTRO", label: "Otro" },
              ]}/>
            </Form.Item>
          </Space.Compact>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Trabajo realizado, materiales utilizados, etc." />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="proveedor" label="Proveedor" style={{ width: 260 }}>
              <Input placeholder="Nombre/Razón Social" />
            </Form.Item>
            <Form.Item name="unidad" label="Unidad" style={{ width: 260 }}>
              <Select
                showSearch allowClear placeholder="Buscar unidad"
                onSearch={(t) => fetchUnidades(t)} filterOption={false} options={uniOpts}
              />
            </Form.Item>
            <Form.Item name="area" label="Área común" style={{ width: 260 }}>
              <Select
                showSearch allowClear placeholder="Elegir área"
                onSearch={(t) => fetchAreas(t)} filterOption={false} options={areaOpts}
              />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="incidente" label="Incidente" style={{ width: 260 }}>
              <Select
                showSearch allowClear placeholder="Vincular incidente"
                onSearch={(t) => fetchIncidentes(t)} filterOption={false} options={incOpts}
              />
            </Form.Item>
            <Form.Item name="estado" label="Estado" style={{ width: 220 }}>
              <Select options={[
                { value: "PENDIENTE", label: "Pendiente" },
                { value: "EN_PROCESO", label: "En proceso" },
                { value: "COMPLETADO", label: "Completado" },
                { value: "ANULADO", label: "Anulado" },
              ]}/>
            </Form.Item>
            <Form.Item name="moneda" label="Moneda" style={{ width: 160 }}>
              <Select options={[{ value: "BOB", label: "BOB" }, { value: "USD", label: "USD" }]} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha" label="Fecha" style={{ width: 220 }} rules={[{ required: true, message: "Requerido" }]}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="fecha_cierre" label="Fecha cierre" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="adjunto_url" label="Adjunto (URL)" style={{ flex: 1 }}>
              <Input placeholder="http(s)://factura/orden_trabajo.pdf" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="costo_materiales" label="Materiales" style={{ width: 200 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="costo_mano_obra" label="Mano de obra" style={{ width: 200 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="costo_otros" label="Otros" style={{ width: 200 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Tooltip title="Monto de impuesto (no porcentaje)">
              <Form.Item name="impuesto" label="Impuesto" style={{ width: 200 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Tooltip>
            <Form.Item shouldUpdate noStyle>
              {() => {
                const v = form.getFieldsValue();
                const total = (Number(v.costo_materiales||0) + Number(v.costo_mano_obra||0) + Number(v.costo_otros||0) + Number(v.impuesto||0)).toFixed(2);
                return (
                  <Form.Item label="Total" style={{ width: 200 }}>
                    <Input value={total} readOnly />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Space.Compact>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
