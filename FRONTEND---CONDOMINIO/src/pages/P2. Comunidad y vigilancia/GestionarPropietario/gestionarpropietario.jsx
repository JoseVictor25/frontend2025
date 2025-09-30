// src/pages/propietarios/GestionarPropietario.jsx
import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Select, Switch, Tag, message } from "antd";
import { listPropietarios, createPropietario, updatePropietario, deletePropietario } from "@/services/propietarios";
import { searchUsuarios } from "@/services/usuarios-lite";

export default function GestionarPropietario() {
  const [data, setData]       = useState([]);
  const [pag, setPag]         = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form] = Form.useForm();

  // usuarios para el Select
  const [userOpts, setUserOpts]     = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  async function fetchUsuarios(q = "") {
    setUserLoading(true);
    try {
      const opts = await searchUsuarios({ page: 1, page_size: 20, search: q || undefined });
      setUserOpts(opts);
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar usuarios");
    } finally { setUserLoading(false); }
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listPropietarios({ page, page_size: pageSize, ordering: "-id" });
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e); message.error("No se pudieron cargar los propietarios");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchUsuarios();
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
    // asegurar que el usuario actual esté listado
    const u = row.usuario_data;
    if (u?.id && !userOpts.find(o => o.value === u.id)) {
      setUserOpts(prev => [{ value: u.id, label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username }, ...prev]);
    }
    form.setFieldsValue({
      usuario: row.usuario,
      estado: row.estado === 'activo',
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        usuario: v.usuario,
        estado: v.estado ? 'activo' : 'inactivo',
      };
      if (editing) {
        await updatePropietario(editing.id, payload);
        message.success("Propietario actualizado");
      } else {
        await createPropietario(payload);
        message.success("Propietario creado");
      }
      setModalOpen(false);
      // vuelve a la primera página para ver el recién creado arriba
      fetchData(1, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function handleDelete(id) {
    try {
      await deletePropietario(id);
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
    {
      title: "Usuario",
      render: (_, r) => {
        const u = r.usuario_data || {};
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        return name || u.username || `user-${u.id || r.usuario}` || "-";
      }
    },
    { title: "Email", render: (_, r) => r.usuario_data?.email || "-" },
    { title: "Estado", dataIndex: "estado", render: (v) => v === 'activo'
        ? <Tag color="green">Activo</Tag>
        : <Tag color="red">Inactivo</Tag>
    },
    {
      title: "Acción",
      width: 200,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar propietario?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Propietario
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
        title={editing ? "Editar Propietario" : "Nuevo Propietario"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="usuario" label="Usuario" rules={[{ required: true, message: "Selecciona un usuario" }]}>
            <Select
              showSearch
              placeholder="Buscar usuario"
              loading={userLoading}
              onSearch={(val) => fetchUsuarios(val)}
              filterOption={false}
              options={userOpts}
            />
          </Form.Item>

          <Form.Item label="Activo" name="estado" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}