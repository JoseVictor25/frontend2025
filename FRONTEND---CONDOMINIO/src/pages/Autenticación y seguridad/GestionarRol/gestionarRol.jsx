/*import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, message, Select, Tag } from "antd";
import { listRolesDetailed, createRole, updateRole, deleteRole, toPermIds } from "@/services/roles";
import { listPermissions } from "@/services/permissions";

export default function GestionarRoles() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [permOptions, setPermOptions] = useState([]);
  const permMap = useMemo(() => {
    const m = new Map();
    permOptions.forEach(p => m.set(p.id, p));
    return m;
  }, [permOptions]);

  async function fetchPerms() {
    try {
      // Trae primeras 500; ajusta si necesitas más
      const res = await listPermissions({ page: 1, page_size: 500, ordering: "app_label,model,codename" });
      const items = res.results || res;
      setPermOptions(items);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los permisos");
    }
  }

  async function fetchData(page = 1, pageSize = 10) {
  setLoading(true);
  try {
    const res = await listRolesDetailed({ page, page_size: pageSize, ordering: "-id" });
    const items = res.results || [];
    const total = res.count || items.length;
    setData(items);
    setPag({ pageSize, current: page, total });
  } catch (e) {
    console.error(e);
    message.error("No se pudieron cargar los roles");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    fetchPerms();
    fetchData(pag.current, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    // El backend puede devolver permissions como IDs o como objetos; normalizamos a IDs
    const permIds = toPermIds(record.permissions);
    form.setFieldsValue({ name: record.name ?? "", permissions: permIds });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const values = await form.validateFields(); // { name, permissions:[ids] }
      if (editing) {
        await updateRole(editing.id, values);
        message.success("Rol actualizado");
      } else {
        await createRole(values);
        message.success("Rol creado");
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
      await deleteRole(id);
      message.success("Eliminado");
      const nextCount = pag.total - 1;
      const lastPage = Math.max(1, Math.ceil(nextCount / pag.pageSize));
      fetchData(Math.min(pag.current, lastPage), pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "NOMBRE", dataIndex: "name", render: (v) => v ?? "-" },
    {
  title: "Permisos",
  dataIndex: "permissions",
  render: (perms) => {
    const ids = toPermIds(perms);
    if (!ids.length) return <span style={{ color: "#999" }}>Sin permisos</span>;
    const labels = ids.slice(0, 3).map((id) => {
      const p = permMap.get(id);
      const text = p ? `${p.app_label}.${p.model}:${p.codename}` : `#${id}`;
      return <Tag key={id}>{text}</Tag>;
    });
    const extra = ids.length > 3 ? <Tag key="more">+{ids.length - 3}</Tag> : null;
    return <Space wrap>{labels}{extra}</Space>;
  },
},

    {
      title: "Acción",
      width: 200,
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar rol?" onConfirm={() => handleDelete(record.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Rol
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
        title={editing ? "Editar Rol" : "Nuevo Rol"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Nombre" name="name" rules={[{ required: true, message: "Requerido" }]}>
            <Input placeholder="p.ej. Administrador, Vigilante, Residente" />
          </Form.Item>

          <Form.Item
            label="Permisos"
            name="permissions"
            rules={[{ required: true, message: "Selecciona al menos un permiso" }]}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="Busca y selecciona permisos"
              optionFilterProp="label"
              maxTagCount="responsive"
              options={(permOptions || []).map((p) => ({
                value: p.id,
                // etiqueta legible: app.model:codename
                label: `${p.app_label}.${p.model}: ${p.codename}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
*/

import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Popconfirm, Modal, Form, Input, message } from "antd";
import { listRoles, createRole, updateRole, deleteRole } from "@/services/roles";

export default function GestionarRoles() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listRoles({ page, page_size: pageSize, ordering: "-id" });
      const items = res.results || [];
      const total = res.count || items.length;
      setData(items);
      setPag({ pageSize, current: page, total });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los roles");
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

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      nombre: record.nombre ?? "",
      descripcion: record.descripcion ?? "",
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const values = await form.validateFields(); // { nombre, descripcion }
      if (editing) {
        await updateRole(editing.id, values);
        message.success("Rol actualizado");
      } else {
        await createRole(values);
        message.success("Rol creado");
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
      await deleteRole(id);
      message.success("Eliminado");
      const nextCount = pag.total - 1;
      const lastPage = Math.max(1, Math.ceil(nextCount / pag.pageSize));
      fetchData(Math.min(pag.current, lastPage), pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Nombre", dataIndex: "nombre", render: (v) => v ?? "-" },
    { title: "Descripción", dataIndex: "descripcion", render: (v) => v || "-" },
    {
      title: "Acción",
      width: 200,
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar rol?" onConfirm={() => handleDelete(record.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Rol
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
        title={editing ? "Editar Rol" : "Nuevo Rol"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input placeholder="p.ej. Administrador, Vigilante, Residente" />
          </Form.Item>

          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea placeholder="Descripción del rol (opcional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
