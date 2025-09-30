import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form, Input,
  message, Tag, Select, DatePicker, Switch, Divider
} from "antd";
import dayjs from "dayjs";
import {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  toggleActivo,
  resetPassword,
  assignRol,
  listRoles,
} from "@/services/usuarios";

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const fmtDate = "YYYY-MM-DD HH:mm";

const ESTADO_OPTS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

export default function GestionarUsuarios() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [rol, setRol] = useState();
  const [estado, setEstado] = useState();
  const [range, setRange] = useState();
  const [rolesOpts, setRolesOpts] = useState([]);

  useEffect(() => {
    // precargar roles para selects
    listRoles().then((rs) => {
      setRolesOpts(rs.map(r => ({ value: r.id, label: r.nombre || r.name })));
    }).catch(() => {});
  }, []);

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();      // nombre/usuario/email
    if (rol) params.rol = rol;                    // id de rol
    if (estado) params.estado = estado;           // ACTIVO/INACTIVO
    if (range?.length === 2) {
      params.desde = dayjs(range[0]).format(fmtDate);
      params.hasta = dayjs(range[1]).format(fmtDate);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listUsuarios(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los usuarios");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Usuario", dataIndex: "username", width: 150 },
    { title: "Nombre", dataIndex: "nombre", width: 200, render: (_, r) => `${r.nombres ?? ""} ${r.apellidos ?? ""}`.trim() || r.nombre || "-" },
    { title: "Email", dataIndex: "email", width: 220 },
    { title: "Rol", dataIndex: "rol_nombre", width: 140, render: v => v || "-" },
    {
      title: "Estado", dataIndex: "activo", width: 110,
      render: (v) => v ? <Tag color="green">Activo</Tag> : <Tag color="default">Inactivo</Tag>
    },
    { title: "Creado", dataIndex: "created_at", width: 170, render: v => v ? dayjs(v).format(fmtDate) : "-" },
    {
      title: "Acción", width: 460, fixed: "right",
      render: (_, r) => (
        <Space wrap>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Typography.Link onClick={() => onToggleActivo(r)}>{r.activo ? "Desactivar" : "Activar"}</Typography.Link>
          <Typography.Link onClick={() => onResetPass(r)}>Resetear contraseña</Typography.Link>
          <Popconfirm title="¿Eliminar usuario?" onConfirm={() => handleDelete(r.id)}>
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
      rol: undefined,
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      username: row.username,
      email: row.email,
      nombres: row.nombres ?? row.first_name,
      apellidos: row.apellidos ?? row.last_name,
      telefono: row.telefono ?? row.phone,
      activo: !!row.activo,
      rol: row.rol_id ?? row.rol,     // id del rol
      bio: row.bio || "",
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = { ...v };
      if (editing) {
        await updateUsuario(editing.id, payload);
        // asignación de rol si cambió
        if (v.rol && v.rol !== (editing.rol_id ?? editing.rol)) {
          await assignRol(editing.id, v.rol);
        }
        message.success("Usuario actualizado");
      } else {
        const u = await createUsuario(payload);
        if (v.rol) await assignRol(u.id, v.rol);
        message.success("Usuario creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function onToggleActivo(row) {
    try {
      await toggleActivo(row.id, !row.activo);
      message.success(!row.activo ? "Usuario activado" : "Usuario desactivado");
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cambiar el estado"); }
  }

  async function onResetPass(row) {
    Modal.confirm({
      title: `Resetear contraseña de ${row.username}?`,
      content: "Se enviará una contraseña temporal o enlace (según tu backend).",
      okText: "Confirmar",
      onOk: async () => {
        try {
          await resetPassword(row.id);
          message.success("Contraseña reseteada");
        } catch { message.error("No se pudo resetear"); }
      }
    });
  }

  async function handleDelete(id) {
    try {
      await deleteUsuario(id);
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
          placeholder="Buscar nombre / usuario / email"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Rol"
          allowClear
          value={rol}
          onChange={setRol}
          options={rolesOpts}
          style={{ width: 220 }}
          showSearch
          optionFilterProp="label"
        />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} options={ESTADO_OPTS} style={{ width: 160 }} />
        <RangePicker showTime format={fmtDate} value={range} onChange={setRange} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setRol(); setEstado(); setRange(); fetchData(1, pag.pageSize); }}>Limpiar</Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Usuario
      </Button>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
        scroll={{ x: 1100 }}
      />

      {/* Modal crear/editar */}
      <Modal
        title={editing ? "Editar Usuario" : "Nuevo Usuario"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="username" label="Usuario" style={{ width: 240 }} rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="usuario" />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ width: 300 }} rules={[{ type: "email", required: true }]}>
              <Input placeholder="correo@dominio.com" />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono" style={{ width: 200 }}>
              <Input placeholder="+591 ..." />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="nombres" label="Nombres" style={{ width: 350 }}>
              <Input />
            </Form.Item>
            <Form.Item name="apellidos" label="Apellidos" style={{ width: 350 }}>
              <Input />
            </Form.Item>
          </Space.Compact>

          {!editing && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <Space.Compact block>
                <Form.Item name="password" label="Contraseña" style={{ width: 350 }} rules={[{ required: true, message: "Requerido" }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item name="password2" label="Repetir contraseña" style={{ width: 350 }} dependencies={["password"]}
                  rules={[
                    { required: true, message: "Requerido" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) return Promise.resolve();
                        return Promise.reject(new Error("Las contraseñas no coinciden"));
                      },
                    }),
                  ]}>
                  <Input.Password />
                </Form.Item>
              </Space.Compact>
            </>
          )}

          <Space.Compact block>
            <Form.Item name="rol" label="Rol" style={{ width: 300 }}>
              <Select options={rolesOpts} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="activo" label="Activo" valuePropName="checked" style={{ width: 160 }}>
              <Switch />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="bio" label="Bio">
            <TextArea rows={3} placeholder="Información adicional…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
