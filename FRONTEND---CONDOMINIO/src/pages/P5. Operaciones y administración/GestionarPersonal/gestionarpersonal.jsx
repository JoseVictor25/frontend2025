// src/pages/RRHH/Personal/gestionarpersonal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, InputNumber, message, Tag, Select, DatePicker, Switch, Avatar
} from "antd";
import dayjs from "dayjs";
import { listPersonal, createPersonal, updatePersonal, deletePersonal, setActivoPersonal } from "@/services/personal";
import { searchUnidades } from "@/services/unidades"; // ya lo tienes en otros módulos

const fmt = "YYYY-MM-DD";

const TURNOS = [
  { value: "MAÑANA", label: "Mañana" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOCHE", label: "Noche" },
];

const CARGOS_DEFAULT = [
  { value: "PORTERO", label: "Portero" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "ADMIN", label: "Administrador" },
  { value: "TECNICO", label: "Técnico" },
];

const DEPARTAMENTOS_DEFAULT = [
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "ADMINISTRACION", label: "Administración" },
];

export default function GestionarPersonal() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [departamento, setDepartamento] = useState();
  const [cargo, setCargo] = useState();
  const [turno, setTurno] = useState();
  const [estado, setEstado] = useState();
  const [unidad, setUnidad] = useState();

  // unidades select
  const [uniOpts, setUniOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  async function fetchUnidades(term = "") {
    try {
      setUniLoading(true);
      const res = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((res || []).map((u) => ({ value: u.id, label: u.label ?? String(u.id) })));
    } finally {
      setUniLoading(false);
    }
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (departamento) params.departamento = departamento;
    if (cargo) params.cargo = cargo;
    if (turno) params.turno = turno;
    if (estado !== undefined) params.is_active = estado;
    if (unidad) params.unidad = unidad;
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listPersonal(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar el personal");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchUnidades(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    {
      title: "", width: 54,
      render: (_, r) => <Avatar src={r.avatar || undefined}>{(r.nombres || "?").slice(0,1)}</Avatar>
    },
    { title: "Nombre", render: (_, r) => `${r.nombres || ""} ${r.apellidos || ""}`.trim() || "-" },
    { title: "Documento", dataIndex: "documento", width: 140, render: v => v || "-" },
    { title: "Cargo", dataIndex: "cargo", width: 160, render: v => v || "-" },
    { title: "Departamento", dataIndex: "departamento", width: 180, render: v => v || "-" },
    { title: "Unidad", dataIndex: "unidad", width: 120, render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Turno", dataIndex: "turno", width: 140, render: v => v || "-" },
    { title: "Teléfono", dataIndex: "telefono", width: 140, render: v => v || "-" },
    { title: "Email", dataIndex: "email", width: 200, render: v => v || "-" },
    { title: "Ingreso", dataIndex: "fecha_ingreso", width: 120, render: v => v || "-" },
    { title: "Salario", dataIndex: "salario", width: 120, align: "right", render: v => Number(v || 0).toFixed(2) },
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
          <Popconfirm title="¿Eliminar registro?" onConfirm={() => handleDelete(r.id)}>
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
      activo: true,
      turno: "MAÑANA",
      fecha_ingreso: dayjs(),
      salario: 0,
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombres: row.nombres,
      apellidos: row.apellidos,
      documento: row.documento,
      email: row.email,
      telefono: row.telefono,
      direccion: row.direccion,
      cargo: row.cargo,
      departamento: row.departamento,
      unidad: row.unidad,
      turno: row.turno,
      fecha_ingreso: row.fecha_ingreso ? dayjs(row.fecha_ingreso) : null,
      salario: row.salario,
      activo: !!row.activo,
      avatar: row.avatar,
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
        fecha_ingreso: v.fecha_ingreso ? v.fecha_ingreso.format(fmt) : undefined,
      };
      if (editing) {
        await updatePersonal(editing.id, payload);
        message.success("Personal actualizado");
      } else {
        await createPersonal(payload);
        message.success("Personal creado");
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
      await setActivoPersonal(row.id, !row.activo);
      message.success(!row.activo ? "Activado" : "Desactivado");
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
  }

  async function handleDelete(id) {
    try {
      await deletePersonal(id);
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
          placeholder="Buscar nombre / documento / email"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 280 }}
        />
        <Select placeholder="Departamento" allowClear value={departamento} onChange={setDepartamento}
          style={{ width: 200 }} options={DEPARTAMENTOS_DEFAULT} />
        <Select placeholder="Cargo" allowClear value={cargo} onChange={setCargo}
          style={{ width: 200 }} options={CARGOS_DEFAULT} />
        <Select placeholder="Turno" allowClear value={turno} onChange={setTurno}
          style={{ width: 160 }} options={TURNOS} />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado}
          style={{ width: 160 }} options={[{value:true,label:"Activos"},{value:false,label:"Inactivos"}]} />
        <Select
          showSearch allowClear placeholder="Unidad"
          value={unidad} onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
          style={{ minWidth: 220 }} options={uniOpts}
        />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setDepartamento(); setCargo(); setTurno(); setEstado(); setUnidad(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo personal
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
        title={editing ? "Editar personal" : "Nuevo personal"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={860}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="nombres" label="Nombres" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="apellidos" label="Apellidos" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="documento" label="Documento" style={{ width: 240 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="CI / DNI" />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ width: 280 }}
              rules={[{ type: "email", message: "Email no válido" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono" style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="direccion" label="Dirección">
            <Input />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="cargo" label="Cargo" style={{ width: 240 }}>
              <Select options={CARGOS_DEFAULT} allowClear showSearch />
            </Form.Item>
            <Form.Item name="departamento" label="Departamento" style={{ width: 260 }}>
              <Select options={DEPARTAMENTOS_DEFAULT} allowClear showSearch />
            </Form.Item>
            <Form.Item name="turno" label="Turno" style={{ width: 200 }}>
              <Select options={TURNOS} />
            </Form.Item>
            <Form.Item name="unidad" label="Unidad" style={{ width: 240 }}>
              <Select
                showSearch allowClear placeholder="Buscar unidad"
                onSearch={(t) => fetchUnidades(t)} filterOption={false} loading={uniLoading}
                options={uniOpts}
              />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="fecha_ingreso" label="Fecha de ingreso" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="salario" label="Salario (mensual)" style={{ width: 220 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="avatar" label="Foto (URL)">
            <Input placeholder="http(s)://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
