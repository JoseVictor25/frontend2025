import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, message, Select, Switch, Tag } from "antd";
import { listUnidades, createUnidad, updateUnidad, deleteUnidad } from "@/services/unidades_habitacionales";
import { searchUnidades as buscarParaSelect } from "@/services/unidades"; // opcional: si quieres un selector de unidad “referencia”, puedes quitarlo

// (Opcional) Si quieres seleccionar Propietario desde backend:
import { listPropietarios } from "@/services/propietarios"; // si no lo tienes, comenta la parte del Select de propietarios

export default function UnidadHabitacional() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // Selects remotos (opcional)
  const [propOps, setPropOps] = useState([]);
  const [propLoading, setPropLoading] = useState(false);

  async function fetchPropietarios(q = "") {
    try {
      setPropLoading(true);
      const res = await listPropietarios({ page: 1, page_size: 30, search: q || undefined, q: q || undefined });
      setPropOps((res.results || []).map(p => ({
        value: p.id,
        label: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || p.email || p.id,
      })));
    } catch {
      setPropOps([]);
    } finally { setPropLoading(false); }
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listUnidades({ page, page_size: pageSize, ordering: "-id" });
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las unidades");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchPropietarios();
    fetchData(pag.current, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ estado: true });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      codigo: row.codigo,
      nombre: row.nombre,
      torre: row.torre,
      numero: row.numero,
      piso: row.piso,
      area_m2: row.area_m2,
      estado: !!row.estado,
      propietario: row.propietario ?? null,
      observacion: row.observacion ?? "",
    });
    if (row.propietario && !propOps.find(x => x.value === row.propietario)) {
      setPropOps(prev => [{ value: row.propietario, label: String(row.propietario) }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      if (editing) {
        await updateUnidad(editing.id, v);
        message.success("Unidad actualizada");
      } else {
        await createUnidad(v);
        message.success("Unidad creada");
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
      await deleteUnidad(id);
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
    { title: "Código", dataIndex: "codigo" },
    { title: "Nombre", dataIndex: "nombre", render: (v) => v || "-" },
    { title: "Torre/Bloque", dataIndex: "torre", render: (v) => v || "-" },
    { title: "N°", dataIndex: "numero", width: 90 },
    { title: "Piso", dataIndex: "piso", width: 90 },
    { title: "Área (m²)", dataIndex: "area_m2", width: 110 },
    {
      title: "Estado",
      dataIndex: "estado",
      width: 110,
      render: (v) => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>),
    },
    { title: "Propietario", dataIndex: "propietario", render: (v) => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    {
      title: "Acción",
      width: 200,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar unidad?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Unidad
      </Button>

      <Table
        rowKey={(r) => r.id ?? r.uuid}
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
        title={editing ? "Editar Unidad Habitacional" : "Nueva Unidad Habitacional"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="codigo" label="Código" style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="Ej: A-302, T1-05, etc." />
            </Form.Item>
            <Form.Item name="nombre" label="Nombre/Alias" style={{ flex: 1 }}>
              <Input placeholder="Opcional (alias de la unidad)" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="torre" label="Torre/Bloque" style={{ flex: 1 }}>
              <Input placeholder="Torre, edificio o bloque" />
            </Form.Item>
            <Form.Item name="numero" label="Número" style={{ flex: 1 }}>
              <Input placeholder="Ej: 302" />
            </Form.Item>
            <Form.Item name="piso" label="Piso" style={{ width: 160 }}>
              <Input placeholder="Ej: 3" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="area_m2" label="Área (m²)" style={{ width: 200 }}>
              <Input placeholder="Ej: 78" />
            </Form.Item>
            <Form.Item label="Estado" name="estado" valuePropName="checked" initialValue={true} style={{ paddingLeft: 16 }}>
              <Switch />
            </Form.Item>
          </Space.Compact>

          {/* Propietario (opcional). Si tu backend no lo maneja, comenta este bloque */}
          <Form.Item name="propietario" label="Propietario (ID)">
            <Select
              showSearch
              placeholder="Buscar propietario por nombre"
              loading={propLoading}
              onSearch={(q) => fetchPropietarios(q)}
              filterOption={false}
              allowClear
              options={propOps}
            />
          </Form.Item>

          <Form.Item name="observacion" label="Observación">
            <Input.TextArea rows={3} placeholder="Notas, estado de entrega, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
