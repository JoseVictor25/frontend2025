import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, message } from "antd";
import { 
  listPermissions, 
  createPermission, 
  updatePermission, 
  deletePermission 
} from "@/services/permissions";

export default function GestionarPermisos() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // cargar permisos
  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listPermissions({ page, page_size: pageSize });
      setData(res.results || []);
      setPag({
        pageSize,
        current: page,
        total: res.count ?? (res.results ? res.results.length : 0), // ✅ sincroniza con backend
      });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los permisos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(pag.current, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      codename: row.codename,
      app_label: row.app_label ?? row.content_type?.app_label,
      model: row.model ?? row.content_type?.model,
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      if (editing) {
        await updatePermission(editing.id, v);
        message.success("Permiso actualizado");
      } else {
        await createPermission(v);
        message.success("Permiso creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "Error al guardar permiso";
      message.error(msg);
    }
  }

  async function handleDelete(id) {
    try {
      await deletePermission(id);
      message.success("Permiso eliminado");
      // recalcular total
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      console.error(e);
      message.error("No se pudo eliminar");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Nombre", dataIndex: "name" },
    { title: "Código", dataIndex: "codename" },
    { 
      title: "Tipo", 
      dataIndex: "content_type", 
      render: (ct) => ct ? `${ct.app_label}/${ct.model}` : "-"
    },
    {
      title: "Acción",
      width: 200,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar permiso?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Permiso
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
        title={editing ? "Editar Permiso" : "Nuevo Permiso"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre legible del permiso" />
          </Form.Item>
          <Form.Item name="codename" label="Codename" rules={[{ required: true }]}>
            <Input placeholder="ej. add_user" />
          </Form.Item>
          <Form.Item name="app_label" label="App" rules={[{ required: true }]}>
            <Input placeholder="ej. accounts" />
          </Form.Item>
          <Form.Item name="model" label="Modelo" rules={[{ required: true }]}>
            <Input placeholder="ej. user" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
