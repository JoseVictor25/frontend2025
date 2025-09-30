// src/pages/Comunidad y vigilancia/Notificaciones/gestionarnotificaciones.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form, Input,
  message, Tag, Select, DatePicker, Switch
} from "antd";
import dayjs from "dayjs";
import {
  listNotificaciones,
  createNotificacion,
  updateNotificacion,
  deleteNotificacion,
  marcarLeida,
  reenviarNotificacion,
  enviarAhora
} from "@/services/notificaciones";

const { TextArea } = Input;
const { RangePicker } = DatePicker;

// Solo para mostrar en inputs/columnas
const fmtDate = "YYYY-MM-DD HH:mm";

// Catálogos UI (el servicio mapea a lo que espera el backend)
const PRIOR = [
  { value: "BAJA", label: "Baja" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];
const CANALES = [
  { value: "PUSH", label: "Push" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];
const DEST_TIPOS = [
  { value: "USUARIO", label: "Usuario" },
  { value: "UNIDAD", label: "Unidad" },
  { value: "ROL", label: "Rol" },
  { value: "TODOS", label: "Todos" },
];
const ESTADO_OPTS = [
  { value: "LEIDA", label: "Leída" },
  { value: "NO_LEIDA", label: "No leída" },
];

/* Helpers de color para tags (UI) */
function prioColor(v) {
  switch ((v || "").toUpperCase()) {
    case "CRITICA": return "volcano";
    case "ALTA": return "red";
    case "NORMAL": return "gold";
    case "BAJA": return "green";
    default: return "default";
  }
}
function canalColor(v) {
  switch ((v || "").toUpperCase()) {
    case "EMAIL": return "geekblue";
    case "SMS": return "purple";
    case "PUSH": return "cyan";
    default: return "default";
  }
}

export default function GestionarNotificaciones() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [prioridad, setPrioridad] = useState();
  const [canal, setCanal] = useState();
  const [estado, setEstado] = useState();
  const [destTipo, setDestTipo] = useState();
  const [range, setRange] = useState();

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (prioridad) params.prioridad = prioridad;
    if (canal) params.canal = canal;
    if (estado) params.estado = estado;
    if (destTipo) params.destinatario_tipo = destTipo;
    if (range?.length === 2) {
      params.desde = dayjs(range[0]).format(fmtDate);
      params.hasta = dayjs(range[1]).format(fmtDate);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listNotificaciones(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Título", dataIndex: "titulo" },
    { title: "Canal", dataIndex: "canal", width: 100, render: v => <Tag color={canalColor(v)}>{v || "-"}</Tag> },
    { title: "Prioridad", dataIndex: "prioridad", width: 110, render: v => <Tag color={prioColor(v)}>{v || "-"}</Tag> },
    { title: "Dest. tipo", dataIndex: "destinatario_tipo", width: 120, render: v => v || "-" },
    { title: "Destinatario", dataIndex: "destinatario", width: 140, render: v => v ?? "-" },
    { title: "Programada", dataIndex: "programada", width: 120, render: v => v ? <Tag color="blue">Sí</Tag> : <Tag>No</Tag> },
    { title: "F. programada", dataIndex: "fecha_programada", width: 170, render: v => v ? dayjs(v).format(fmtDate) : "-" },
    { title: "F. envío", dataIndex: "fecha_envio", width: 170, render: v => v ? dayjs(v).format(fmtDate) : "-" },
    {
      title: "Leída", dataIndex: "leida", width: 90,
      render: (v) => v ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>
    },
    {
      title: "Acción", width: 420,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Typography.Link onClick={() => toggleLeida(r)}>{r.leida ? "Marcar no leída" : "Marcar leída"}</Typography.Link>
          <Typography.Link onClick={() => onReenviar(r)}>Reenviar</Typography.Link>
          {r.programada && <Typography.Link onClick={() => onEnviarAhora(r)}>Enviar ahora</Typography.Link>}
          <Popconfirm title="¿Eliminar notificación?" onConfirm={() => handleDelete(r.id)}>
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
      canal: "PUSH",
      prioridad: "NORMAL",
      programada: false,
      fecha_programada: null,
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      titulo: row.titulo,
      mensaje: row.mensaje,           // el servicio lo enviará como "cuerpo"
      tipo: row.tipo,
      prioridad: row.prioridad,
      canal: row.canal,
      destinatario_tipo: row.destinatario_tipo,
      destinatario: row.destinatario,
      programada: !!row.programada,
      fecha_programada: row.fecha_programada ? dayjs(row.fecha_programada) : null,
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        // pasamos dayjs directo, el servicio lo convertirá a ISO
        fecha_programada: v.programada && v.fecha_programada ? v.fecha_programada : null,
      };
      if (editing) {
        await updateNotificacion(editing.id, payload);
        message.success("Notificación actualizada");
      } else {
        await createNotificacion(payload);
        message.success("Notificación creada");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function toggleLeida(row) {
    try {
      await marcarLeida(row.id, !row.leida);
      message.success(!row.leida ? "Marcada como leída" : "Marcada como no leída");
      fetchData(pag.current, pag.pageSize);
    } catch {
      message.error("No se pudo cambiar el estado");
    }
  }

  async function onReenviar(row) {
    try {
      await reenviarNotificacion(row.id);
      message.success("Reenviada");
    } catch {
      message.error("No se pudo reenviar");
    }
  }

  async function onEnviarAhora(row) {
    try {
      await enviarAhora(row.id);
      message.success("Enviada");
      fetchData(pag.current, pag.pageSize);
    } catch {
      message.error("No se pudo enviar ahora");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNotificacion(id);
      message.success("Eliminada");
      const nextTotal = pag.total - 1;
      const lastPage = Math.max(1, Math.ceil(nextTotal / pag.pageSize));
      fetchData(Math.min(pag.current, lastPage), pag.pageSize);
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
          placeholder="Buscar título / mensaje"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 280 }}
        />
        <Select placeholder="Prioridad" allowClear value={prioridad} onChange={setPrioridad} options={PRIOR} style={{ width: 160 }} />
        <Select placeholder="Canal" allowClear value={canal} onChange={setCanal} options={CANALES} style={{ width: 140 }} />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} options={ESTADO_OPTS} style={{ width: 150 }} />
        <Select placeholder="Dest. tipo" allowClear value={destTipo} onChange={setDestTipo} options={DEST_TIPOS} style={{ width: 170 }} />
        <RangePicker showTime format={fmtDate} value={range} onChange={setRange} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button
          onClick={() => {
            setQ(""); setPrioridad(); setCanal(); setEstado(); setDestTipo(); setRange();
            fetchData(1, pag.pageSize);
          }}
        >
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Notificación
      </Button>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
      />

      {/* Modal crear/editar */}
      <Modal
        title={editing ? "Editar Notificación" : "Nueva Notificación"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: "Requerido" }]}>
            <Input placeholder="Título del aviso" />
          </Form.Item>

          <Form.Item name="mensaje" label="Mensaje" rules={[{ required: true, message: "Requerido" }]}>
            <TextArea rows={4} placeholder="Contenido del aviso…" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select allowClear placeholder="General / Seguridad / Mantenimiento…" options={[
                { value: "General", label: "General" },
                { value: "Seguridad", label: "Seguridad" },
                { value: "Mantenimiento", label: "Mantenimiento" },
              ]}/>
            </Form.Item>

            <Form.Item name="prioridad" label="Prioridad" style={{ width: 180 }}>
              <Select options={PRIOR} />
            </Form.Item>

            <Form.Item name="canal" label="Canal" style={{ width: 160 }}>
              <Select options={CANALES} />
            </Form.Item>

            <Form.Item name="destinatario_tipo" label="Destinatario (tipo)" style={{ width: 220 }}>
              <Select options={DEST_TIPOS} />
            </Form.Item>

            <Form.Item name="destinatario" label="Destinatario (ID/código)" style={{ flex: 1 }}>
              <Input placeholder="Ej: id usuario / unidad / rol" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="programada" label="Programar envío" valuePropName="checked" style={{ width: 200 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="fecha_programada" label="Fecha/hora" style={{ width: 260 }}>
              <DatePicker showTime style={{ width: "100%" }} format={fmtDate} />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </div>
  );
}
