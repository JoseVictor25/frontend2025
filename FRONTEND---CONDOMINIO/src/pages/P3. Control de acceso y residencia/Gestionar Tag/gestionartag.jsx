// src/pages/P3. Control de acceso y residencia/Gestionar Tag/gestionartag.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Popconfirm,
  Modal,
  Form,
  Input,
  message,
  Tag as AntTag,
  Select,
  DatePicker,
  Switch,
  Tooltip,
  ColorPicker, // AntD v5+
} from "antd";
import dayjs from "dayjs";
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  toggleActivo,
} from "@/services/tags";

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const fmtDate = "YYYY-MM-DD HH:mm";

const ESTADO_OPTS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

// helpers
const toSlug = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normHex = (v) => {
  if (!v) return undefined;
  if (typeof v === "string") {
    const m = v.match(/^#?[0-9a-fA-F]{6}$/);
    return m ? (v.startsWith("#") ? v : `#${v}`) : v;
  }
  try {
    return v.toHexString(); // tinycolor from ColorPicker
  } catch {
    return v;
  }
};

export default function GestionarTags() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState();
  const [range, setRange] = useState();

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (estado) params.estado = estado;
    if (range?.length === 2) {
      params.desde = dayjs(range[0]).format(fmtDate);
      params.hasta = dayjs(range[1]).format(fmtDate);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listTags(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los tags");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        width: 90,
        render: (v) => (v ? String(v).slice(0, 8) + "…" : "-"),
      },
      {
        title: "Nombre",
        dataIndex: "nombre",
        render: (_, r) => (
          <Space>
            <AntTag color={r.color || "default"} style={{ marginRight: 0 }}>
              {r.nombre}
            </AntTag>
            <span style={{ color: "#64748b" }}>
              {r.slug ? `#${r.slug}` : ""}
            </span>
          </Space>
        ),
      },
      {
        title: "Color",
        dataIndex: "color",
        width: 140,
        render: (v) =>
          v ? (
            <Space>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: "1px solid #e5e7eb",
                  background: v,
                }}
              />
              <span>{String(v).toUpperCase()}</span>
            </Space>
          ) : (
            "-"
          ),
      },
      {
        title: "Descripción",
        dataIndex: "descripcion",
        ellipsis: { showTitle: false },
        render: (v) =>
          v ? (
            <Tooltip title={v}>
              <span>{v}</span>
            </Tooltip>
          ) : (
            "-"
          ),
      },
      {
        title: "Estado",
        dataIndex: "activo",
        width: 110,
        render: (v) => (v ? <AntTag color="green">Activo</AntTag> : <AntTag>Inactivo</AntTag>),
      },
      {
        title: "Creado",
        dataIndex: "created_at",
        width: 170,
        render: (v) => (v ? dayjs(v).format(fmtDate) : "-"),
      },
      {
        title: "Acción",
        width: 380,
        fixed: "right",
        render: (_, r) => (
          <Space wrap>
            <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
            <Typography.Link onClick={() => onToggleActivo(r)}>
              {r.activo ? "Desactivar" : "Activar"}
            </Typography.Link>
            <Popconfirm
              title="¿Eliminar tag?"
              onConfirm={() => handleDelete(r.id)}
            >
              <a>Eliminar</a>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [] // columnas estáticas
  );

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      activo: true,
      color: "#10b981",
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      slug: row.slug,
      color: row.color || "#10b981",
      descripcion: row.descripcion,
      activo: !!row.activo,
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = { ...v, color: normHex(v.color) };
      if (!payload.slug && payload.nombre) payload.slug = toSlug(payload.nombre);

      if (editing) {
        await updateTag(editing.id, payload);
        message.success("Tag actualizado");
      } else {
        await createTag(payload);
        message.success("Tag creado");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data
          ? JSON.stringify(e.response.data)
          : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function onToggleActivo(row) {
    try {
      await toggleActivo(row.id, !row.activo);
      message.success(!row.activo ? "Tag activado" : "Tag desactivado");
      fetchData(pag.current, pag.pageSize);
    } catch {
      message.error("No se pudo cambiar el estado");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTag(id);
      message.success("Eliminado");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : "No se pudo eliminar";
      message.error(msg);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar nombre / slug / descripción"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => fetchData(1, pag.pageSize)}
          style={{ width: 320 }}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={estado}
          onChange={setEstado}
          options={ESTADO_OPTS}
          style={{ width: 160 }}
        />
        <RangePicker
          showTime
          format={fmtDate}
          value={range}
          onChange={setRange}
        />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button
          onClick={() => {
            setQ("");
            setEstado();
            setRange();
            fetchData(1, pag.pageSize);
          }}
        >
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nuevo Tag
      </Button>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ ...pag, onChange: (c, s) => fetchData(c, s) }}
        scroll={{ x: 1000 }}
      />

      {/* Modal crear/editar */}
      <Modal
        title={editing ? "Editar Tag" : "Nuevo Tag"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(chg) => {
            if ("nombre" in chg) {
              const nombre = chg.nombre || "";
              const slug = form.getFieldValue("slug");
              if (!slug || slug === toSlug(slug)) {
                form.setFieldsValue({ slug: toSlug(nombre) });
              }
            }
          }}
        >
          <Space.Compact block>
            <Form.Item
              name="nombre"
              label="Nombre"
              style={{ width: 360 }}
              rules={[{ required: true, message: "Requerido" }]}
            >
              <Input placeholder="p. ej. Seguridad, Mantenimiento, Urgente" />
            </Form.Item>
            <Form.Item name="slug" label="Slug" style={{ width: 260 }}>
              <Input placeholder="separado-por-guiones" />
            </Form.Item>
          </Space.Compact>

          <Space align="start" style={{ width: "100%", marginBottom: 8 }}>
            <Form.Item name="color" label="Color" style={{ marginRight: 16 }}>
              <ColorPicker format="hex" />
            </Form.Item>
            <Form.Item name="activo" label="Activo" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={3} placeholder="Describe el uso de este tag…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
