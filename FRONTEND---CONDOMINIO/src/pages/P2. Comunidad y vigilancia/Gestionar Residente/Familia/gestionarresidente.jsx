import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, message, Select, Switch, Tag, DatePicker } from "antd";
import dayjs from "dayjs";
import { listResidentes, createResidente, updateResidente, deleteResidente } from "@/services/residentes";
import { searchUnidades } from "@/services/unidades";

const fmt = "YYYY-MM-DD";

const PARENTESCOS = [
  { value: "Titular", label: "Titular" },
  { value: "Conyuge", label: "Cónyuge" },
  { value: "Hijo", label: "Hijo/a" },
  { value: "Padre", label: "Padre/Madre" },
  { value: "Hermano", label: "Hermano/a" },
  { value: "Otro", label: "Otro" },
];

export default function GestionarResidente() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [uniOpts, setUniOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  async function fetchUnidades(q = "") {
    setUniLoading(true);
    try {
      const items = await searchUnidades({ page: 1, page_size: 20, search: q || undefined, q: q || undefined });
      setUniOpts(items.map(u => ({ value: u.id, label: u.label })));
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar las unidades");
    } finally { setUniLoading(false); }
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listResidentes({ page, page_size: pageSize, ordering: "-id" });
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar los residentes");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchUnidades();
    fetchData(pag.current, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      apellido: row.apellido,
      dni: row.dni,
      telefono: row.telefono,
      email: row.email,
      parentesco: row.parentesco || undefined,
      fecha_nac: row.fecha_nac ? dayjs(row.fecha_nac) : null,
      unidad: row.unidad,
      activo: !!row.activo,
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
        fecha_nac: v.fecha_nac ? v.fecha_nac.format(fmt) : null,
      };
      if (editing) {
        await updateResidente(editing.id, payload);
        message.success("Residente actualizado");
      } else {
        await createResidente(payload);
        message.success("Residente creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteResidente(id);
      message.success("Eliminado");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Nombre", render: (_, r) => `${r.nombre || "-"} ${r.apellido || ""}`.trim() || "-" },
    { title: "DNI", dataIndex: "dni" },
    { title: "Teléfono", dataIndex: "telefono" },
    { title: "Email", dataIndex: "email" },
    { title: "Parentesco", dataIndex: "parentesco", render: (v) => v || "-" },
    { title: "F. Nacimiento", dataIndex: "fecha_nac", render: (v) => v || "-" },
    { title: "Unidad", dataIndex: "unidad", render: (v) => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    {
      title: "Estado",
      dataIndex: "activo",
      width: 110,
      render: (v) => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>),
    },
    {
      title: "Acción",
      width: 200,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar residente?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Residente
      </Button>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          ...pag,
          onChange: (current, pageSize) => fetchData(current, pageSize),
        }}
      />

      <Modal
        title={editing ? "Editar Residente" : "Nuevo Residente"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="nombre" label="Nombre" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Nombre" />
            </Form.Item>
            <Form.Item name="apellido" label="Apellido" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Apellido" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="dni" label="DNI" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Documento de identidad" />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono" style={{ flex: 1 }}>
              <Input placeholder="Teléfono" />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email inválido" }]}>
            <Input placeholder="correo@dominio.com" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="parentesco" label="Parentesco" style={{ flex: 1 }}>
              <Select options={PARENTESCOS} placeholder="Seleccione parentesco" allowClear />
            </Form.Item>
            <Form.Item name="fecha_nac" label="Fecha de nacimiento" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="unidad" label="Unidad" rules={[{ required: true, message: "Selecciona una unidad" }]}>
            <Select
              showSearch
              placeholder="Buscar unidad (código/nombre)"
              loading={uniLoading}
              onSearch={(val) => fetchUnidades(val)}
              filterOption={false}
              options={uniOpts}
            />
          </Form.Item>

          <Form.Item label="Activo" name="activo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
