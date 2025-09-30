// src/pages/Comunidad y vigilancia/GestionarVisita/gestionarvisita.jsx
import React, { useEffect, useState } from "react";
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
  Select,
  Tag,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import {
  listVisitas,
  createVisita,
  updateVisita,
  deleteVisita,
  checkInVisita,
  checkOutVisita,
} from "@/services/visitas";
import { searchUnidades } from "@/services/unidades";

const fmtDate = "YYYY-MM-DD";
const fmtDateTime = "YYYY-MM-DD HH:mm";

// ===================== Helpers para mostrar datos aunque el backend use otros nombres =====================
function pickName(r) {
  const raw = r?.raw || r;
  const parts = [
    r?.nombre,
    raw?.nombre,
    raw?.visitante,
    raw?.name,
    raw?.fullname,
    raw?.visitor?.full_name,
    [raw?.visitor?.first_name, raw?.visitor?.last_name].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts[0] || "-";
}
function pickDoc(r) {
  const raw = r?.raw || r;
  return (
    r?.documento ||
    raw?.documento ||
    raw?.dni ||
    raw?.doc ||
    raw?.cedula ||
    raw?.document ||
    "-"
  );
}
function pickPhone(r) {
  const raw = r?.raw || r;
  return r?.telefono || raw?.telefono || raw?.phone || raw?.phone_number || "-";
}
function pickUnit(r) {
  const raw = r?.raw || r;
  const u =
    r?.unidad ??
    raw?.unidad ??
    raw?.unit ??
    raw?.unit_id ??
    raw?.unidad_id ??
    raw?.unit_uuid ??
    raw?.unidad_uuid;
  if (!u) return "-";
  if (typeof u === "object") {
    return u.nombre || u.name || u.codigo || u.code || u.id || u.uuid || "-";
  }
  return String(u);
}

// =========================================== Componente ===========================================
export default function GestionarVisita() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [uniOpts, setUniOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  // ---------- Unidades para el Select ----------
  async function fetchUnidades(q = "") {
    setUniLoading(true);
    try {
      const items = await searchUnidades({
        page: 1,
        page_size: 20,
        search: q || undefined,
        q: q || undefined,
      });
      setUniOpts(items.map((u) => ({ value: u.id, label: u.label })));
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las unidades");
    } finally {
      setUniLoading(false);
    }
  }

  // ---------- Listado ----------
  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listVisitas({ page, page_size: pageSize, ordering: "-id" });
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las visitas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUnidades();
    fetchData(pag.current, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Modal CRUD ----------
  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: pickName(row) !== "-" ? pickName(row) : undefined,
      documento: pickDoc(row) !== "-" ? pickDoc(row) : undefined,
      telefono: pickPhone(row) !== "-" ? pickPhone(row) : undefined,
      motivo: row.motivo ?? row?.raw?.motivo ?? row?.raw?.reason,
      unidad: row.unidad ?? row?.raw?.unidad ?? row?.raw?.unit ?? undefined,
      fecha: row.fecha ? dayjs(row.fecha) : row?.raw?.date ? dayjs(row.raw.date) : null,
      hora_entrada: row.hora_entrada
        ? dayjs(row.hora_entrada)
        : row?.raw?.checkin
        ? dayjs(row.raw.checkin)
        : null,
      hora_salida: row.hora_salida
        ? dayjs(row.hora_salida)
        : row?.raw?.checkout
        ? dayjs(row.raw.checkout)
        : null,
      autorizado_por: row.autorizado_por ?? row?.raw?.authorized_by,
      placa: row.placa ?? row?.raw?.plate ?? row?.raw?.vehiculo,
    });
    if ((row.unidad || row?.raw?.unit) && !uniOpts.find((o) => o.value === (row.unidad ?? row?.raw?.unit))) {
      setUniOpts((prev) => [{ value: row.unidad ?? row.raw.unit, label: pickUnit(row) }, ...prev]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha: v.fecha ? v.fecha.format(fmtDate) : null,
        hora_entrada: v.hora_entrada ? v.hora_entrada.format(fmtDateTime) : null,
        hora_salida: v.hora_salida ? v.hora_salida.format(fmtDateTime) : null,
      };
      if (editing) {
        await updateVisita(editing.id, payload);
        message.success("Visita actualizada");
      } else {
        await createVisita(payload);
        message.success("Visita creada");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  // ---------- Acciones rápidas ----------
  async function onCheckIn(row) {
    try {
      const now = dayjs().format(fmtDateTime);
      await checkInVisita(row.id, now);
      message.success("Entrada registrada");
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      message.error("No se pudo marcar la entrada");
    }
  }
  async function onCheckOut(row) {
    try {
      const now = dayjs().format(fmtDateTime);
      await checkOutVisita(row.id, now);
      message.success("Salida registrada");
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      message.error("No se pudo marcar la salida");
    }
  }

  async function deleteRow(id) {
    try {
      await deleteVisita(id);
      message.success("Eliminado");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  // ---------- Columnas ----------
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 90,
      render: (v) => (v ? String(v).slice(0, 8) + "…" : "-"),
    },
    { title: "Visitante", render: (_, r) => pickName(r) },
    { title: "Doc", width: 110, render: (_, r) => pickDoc(r) },
    { title: "Teléfono", width: 120, render: (_, r) => pickPhone(r) },
    {
      title: "Motivo",
      dataIndex: "motivo",
      render: (v, r) => v || r?.raw?.motivo || r?.raw?.reason || "-",
    },
    { title: "Unidad", render: (_, r) => pickUnit(r) },
    {
      title: "Fecha",
      dataIndex: "fecha",
      width: 120,
      render: (v, r) => v || r?.raw?.date || r?.raw?.created_at || "-",
    },
    {
      title: "Entrada",
      dataIndex: "hora_entrada",
      width: 150,
      render: (v, r) => v || r?.raw?.checkin || r?.raw?.entrada || "-",
    },
    {
      title: "Salida",
      dataIndex: "hora_salida",
      width: 150,
      render: (v, r) => v || r?.raw?.checkout || r?.raw?.salida || "-",
    },
    {
      title: "Estado",
      dataIndex: "estado",
      width: 120,
      render: (v, r) => {
        const val =
          v ||
          r?.raw?.status ||
          (r?.hora_entrada || r?.raw?.checkin
            ? r?.hora_salida || r?.raw?.checkout
              ? "SALIO"
              : "EN_CASA"
            : "PENDIENTE");
        const map = { PENDIENTE: "default", EN_CASA: "green", SALIO: "red" };
        return <Tag color={map[val] || "default"}>{val}</Tag>;
      },
    },
    {
      title: "Acción",
      width: 260,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {!r.hora_entrada && !r?.raw?.checkin && (
            <Typography.Link onClick={() => onCheckIn(r)}>Entrada</Typography.Link>
          )}
          {(r.hora_entrada || r?.raw?.checkin) &&
            !(r.hora_salida || r?.raw?.checkout) && (
              <Typography.Link onClick={() => onCheckOut(r)}>Salida</Typography.Link>
            )}
          <Popconfirm title="¿Eliminar visita?" onConfirm={() => deleteRow(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---------- Render ----------
  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Visita
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
        title={editing ? "Editar Visita" : "Nueva Visita"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item
              name="nombre"
              label="Visitante"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}
            >
              <Input placeholder="Nombre completo" />
            </Form.Item>
            <Form.Item name="documento" label="Documento" style={{ width: 220 }}>
              <Input placeholder="DNI / CI" />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono" style={{ width: 220 }}>
              <Input placeholder="Teléfono" />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="motivo" label="Motivo">
            <Input placeholder="Motivo de la visita" />
          </Form.Item>

          <Form.Item
            name="unidad"
            label="Unidad"
            rules={[{ required: true, message: "Selecciona una unidad" }]}
          >
            <Select
              showSearch
              placeholder="Buscar unidad (código/nombre)"
              loading={uniLoading}
              onSearch={(val) => fetchUnidades(val)}
              filterOption={false}
              options={uniOpts}
            />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="fecha" label="Fecha" style={{ width: 220 }}>
              <DatePicker style={{ width: "100%" }} format={fmtDate} />
            </Form.Item>
            <Form.Item name="hora_entrada" label="Hora entrada" style={{ width: 260 }}>
              <DatePicker showTime style={{ width: "100%" }} format={fmtDateTime} />
            </Form.Item>
            <Form.Item name="hora_salida" label="Hora salida" style={{ width: 260 }}>
              <DatePicker showTime style={{ width: "100%" }} format={fmtDateTime} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="autorizado_por" label="Autorizado por" style={{ flex: 1 }}>
              <Input placeholder="Nombre del residente/autoriza" />
            </Form.Item>
            <Form.Item name="placa" label="Placa vehículo" style={{ width: 220 }}>
              <Input placeholder="ABC-123" />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </div>
  );
}
