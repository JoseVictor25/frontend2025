// src/pages/Mantenimiento/Servicios/gestionarservicios.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker, Switch
} from "antd";
import dayjs from "dayjs";
import {
  listServicios, createServicio, updateServicio, deleteServicio, setActivoServicio
} from "@/services/servicios";
import { searchUnidades } from "@/services/unidades";
import { listAreas } from "@/services/areas_comunes";

const fmt = "YYYY-MM-DD";

const TIPOS = [
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "OTRO", label: "Otro" },
];

const PERIODOS = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "ANUAL", label: "Anual" },
  { value: "USO", label: "Por uso" },
];

export default function GestionarServicios() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState();
  const [periodicidad, setPeriodicidad] = useState();
  const [estado, setEstado] = useState();
  const [unidad, setUnidad] = useState();
  const [area, setArea] = useState();
  const [range, setRange] = useState();

  // selects
  const [uniOpts, setUniOpts] = useState([]);
  const [areaOpts, setAreaOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);

  async function fetchUnidades(term = "") {
    try {
      setUniLoading(true);
      const res = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((res || []).map((u) => ({ value: u.id, label: u.label ?? String(u.id) })));
    } finally { setUniLoading(false); }
  }
  async function fetchAreas(term = "") {
    try {
      setAreaLoading(true);
      const res = await listAreas?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = res?.results || res || [];
      setAreaOpts(arr.map(a => ({ value: a.id, label: a.nombre || `Área ${a.id}` })));
    } finally { setAreaLoading(false); }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (tipo) params.tipo = tipo;
    if (periodicidad) params.periodicidad = periodicidad;
    if (estado !== undefined) params.is_active = estado;
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
      const res = await listServicios(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los servicios");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchUnidades(); fetchAreas(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Nombre", dataIndex: "nombre", ellipsis: true },
    { title: "Tipo", dataIndex: "tipo", width: 150, render: v => v || "-" },
    { title: "Proveedor", dataIndex: "proveedor", width: 200, ellipsis: true, render: v => v || "-" },
    { title: "Periodicidad", dataIndex: "periodicidad", width: 140, render: v => v || "-" },
    { title: "Unidad", dataIndex: "unidad", width: 120, render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Área", dataIndex: "area", width: 120, render: v => v ? <Tag color="purple">{String(v)}</Tag> : "-" },
    { title: "Inicio", dataIndex: "fecha_inicio", width: 120, render: v => v || "-" },
    { title: "Fin", dataIndex: "fecha_fin", width: 120, render: v => v || "-" },
    { title: "Costo", dataIndex: "costo", width: 120, align: "right", render: v => Number(v || 0).toFixed(2) },
    {
      title: "Estado", dataIndex: "activo", width: 110,
      render: v => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>)
    },
    {
      title: "Acción", width: 360,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Typography.Link onClick={() => toggleActivo(r)}>{r.activo ? "Desactivar" : "Activar"}</Typography.Link>
          <Popconfirm title="¿Eliminar servicio?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      tipo: "MANTENIMIENTO",
      periodicidad: "MENSUAL",
      moneda: "BOB",
      activo: true,
      fecha_inicio: dayjs(),
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      descripcion: row.descripcion,
      tipo: row.tipo,
      proveedor: row.proveedor,
      costo: row.costo,
      moneda: row.moneda,
      periodicidad: row.periodicidad,
      fecha_inicio: row.fecha_inicio ? dayjs(row.fecha_inicio) : null,
      fecha_fin: row.fecha_fin ? dayjs(row.fecha_fin) : null,
      unidad: row.unidad,
      area: row.area,
      activo: !!row.activo,
      notas: row.notas,
    });
    // aseguramos opciones visibles
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
        fecha_inicio: v.fecha_inicio ? v.fecha_inicio.format(fmt) : undefined,
        fecha_fin: v.fecha_fin ? v.fecha_fin.format(fmt) : undefined,
      };
      if (editing) {
        await updateServicio(editing.id, payload);
        message.success("Servicio actualizado");
      } else {
        await createServicio(payload);
        message.success("Servicio creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function toggleActivo(row) {
    try {
      await setActivoServicio(row.id, !row.activo);
      message.success(!row.activo ? "Servicio activado" : "Servicio desactivado");
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
  }

  async function handleDelete(id) {
    try {
      await deleteServicio(id);
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
          placeholder="Buscar nombre / proveedor"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 280 }}
        />
        <Select placeholder="Tipo" allowClear value={tipo} onChange={setTipo} style={{ width: 180 }} options={TIPOS} />
        <Select placeholder="Periodicidad" allowClear value={periodicidad} onChange={setPeriodicidad} style={{ width: 180 }} options={PERIODOS} />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} style={{ width: 160 }}
          options={[{ value: true, label: "Activos" }, { value: false, label: "Inactivos" }]} />
        <Select
          showSearch allowClear placeholder="Unidad"
          value={unidad} onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
          style={{ minWidth: 220 }} options={uniOpts}
        />
        <Select
          showSearch allowClear placeholder="Área común"
          value={area} onChange={setArea}
          onSearch={(t) => fetchAreas(t)} filterOption={false} loading={areaLoading}
          style={{ minWidth: 220 }} options={areaOpts}
        />
        <DatePicker.RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setTipo(); setPeriodicidad(); setEstado(); setUnidad(); setArea(); setRange(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo servicio
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
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="nombre" label="Nombre" style={{ flex: 1 }} rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Ej: Limpieza de áreas comunes" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select options={TIPOS} />
            </Form.Item>
            <Form.Item name="periodicidad" label="Periodicidad" style={{ width: 200 }}>
              <Select options={PERIODOS} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="proveedor" label="Proveedor" style={{ width: 280 }}>
              <Input placeholder="Nombre / Razón social" />
            </Form.Item>
            <Form.Item name="costo" label="Costo" style={{ width: 200 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="moneda" label="Moneda" style={{ width: 160 }}>
              <Select options={[{ value: "BOB", label: "BOB" }, { value: "USD", label: "USD" }]} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha_inicio" label="Fecha inicio" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="fecha_fin" label="Fecha fin" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="unidad" label="Unidad" style={{ width: 240 }}>
              <Select
                showSearch allowClear placeholder="Buscar unidad"
                onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
                options={uniOpts}
              />
            </Form.Item>
            <Form.Item name="area" label="Área común" style={{ width: 240 }}>
              <Select
                showSearch allowClear placeholder="Elegir área"
                onSearch={(t) => fetchAreas(t)} filterOption={false} loading={areaLoading}
                options={areaOpts}
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
