// src/pages/Comunidad y vigilancia/AreasComunes/gestionarareas.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, message, Tag, Select, Switch, InputNumber, TimePicker
} from "antd";
import dayjs from "dayjs";
import { listAreas, createArea, updateArea, deleteArea } from "@/services/areas_comunes";

const timeFmt = "HH:mm";

export default function GestionarAreas() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // filtros
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState();
  const [estado, setEstado] = useState();
  const [bookable, setBookable] = useState();

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Nombre", dataIndex: "nombre" },

    // >>>>>>>>>>>> TIPO (tolerante) <<<<<<<<<<<<
    {
      title: "Tipo",
      dataIndex: "tipo",
      render: (_, r) =>
        r.tipo || r?.raw?.type || r?.raw?.category || r?.raw?.categoria || "-"
    },

    { title: "Ubicación", dataIndex: "ubicacion", render: v => v || "-" },
    { title: "Aforo", dataIndex: "aforo", width: 90, render: v => v ?? "-" },

    // >>>>>>>>>>>> HORARIO (tolerante) <<<<<<<<<<<<
    {
      title: "Horario",
      width: 180,
      render: (_, r) => {
        const ini = r.horario_inicio || r?.raw?.hora_inicio || r?.raw?.start_time || r?.raw?.open_from || "-";
        const fin = r.horario_fin    || r?.raw?.hora_fin    || r?.raw?.end_time   || r?.raw?.open_to   || "-";
        return `${ini} - ${fin}`;
      }
    },

    {
      title: "Reserva", dataIndex: "requiere_reserva", width: 110,
      render: v => (v ? <Tag color="blue">Requiere</Tag> : <Tag>Libre</Tag>)
    },

    // >>>>>>>>>>>> COSTO (tolerante) <<<<<<<<<<<<
    {
      title: "Costo",
      dataIndex: "costo",
      width: 110,
      render: (v, r) => {
        const val = v ?? r?.raw?.precio ?? r?.raw?.tarifa ?? r?.raw?.fee ?? r?.raw?.price ?? r?.raw?.rate;
        return val != null && val !== "" ? `Bs ${val}` : "-";
      }
    },

    {
      title: "Estado", dataIndex: "activo", width: 110,
      render: v => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>)
    },
    {
      title: "Acción", width: 220,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar área?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize, ordering: "-id" };
    if (q?.trim()) params.search = q.trim(); // o 'q' según tu API
    if (tipo) params.tipo = tipo;            // o 'type'
    if (estado !== undefined) params.activo = estado; // true/false
    if (bookable !== undefined) params.requiere_reserva = bookable; // true/false
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listAreas(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las áreas");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(1, pag.pageSize); /* eslint-disable-next-line */ }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ activo: true, requiere_reserva: false });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      descripcion: row.descripcion,
      tipo: row.tipo || row?.raw?.type || row?.raw?.category || row?.raw?.categoria,
      ubicacion: row.ubicacion,
      aforo: row.aforo,
      requiere_reserva: !!row.requiere_reserva,
      costo: row.costo ?? row?.raw?.precio ?? row?.raw?.tarifa ?? row?.raw?.fee ?? row?.raw?.price ?? row?.raw?.rate,
      activo: !!row.activo,

      // >>>>>>>>>>>> precarga tolerante del horario <<<<<<<<<<<<
      horario:
        (row.horario_inicio && row.horario_fin)
          ? [dayjs(row.horario_inicio, timeFmt), dayjs(row.horario_fin, timeFmt)]
          : (row?.raw?.hora_inicio && row?.raw?.hora_fin)
            ? [dayjs(row.raw.hora_inicio, timeFmt), dayjs(row.raw.hora_fin, timeFmt)]
            : (row?.raw?.start_time && row?.raw?.end_time)
              ? [dayjs(row.raw.start_time, timeFmt), dayjs(row.raw.end_time, timeFmt)]
              : (row?.raw?.open_from && row?.raw?.open_to)
                ? [dayjs(row.raw.open_from, timeFmt), dayjs(row.raw.open_to, timeFmt)]
                : undefined,

      reglas: row.reglas,
      color: row.color || undefined,
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        horario_inicio: v.horario?.[0] ? v.horario[0].format(timeFmt) : null,
        horario_fin:    v.horario?.[1] ? v.horario[1].format(timeFmt) : null,
      };
      delete payload.horario;

      if (editing) {
        await updateArea(editing.id, payload);
        message.success("Área actualizada");
      } else {
        await createArea(payload);
        message.success("Área creada");
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
      await deleteArea(id);
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
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por nombre/descr."
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={() => fetchData(1, pag.pageSize)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Tipo"
          allowClear
          value={tipo}
          onChange={setTipo}
          style={{ width: 160 }}
          options={[
            { value: "Gimnasio", label: "Gimnasio" },
            { value: "Piscina", label: "Piscina" },
            { value: "Parrilla", label: "Parrilla" },
            { value: "Sala", label: "Sala de usos múltiples" },
          ]}
        />
        <Select
          placeholder="Reserva"
          allowClear
          value={bookable}
          onChange={setBookable}
          style={{ width: 160 }}
          options={[
            { value: true, label: "Requiere" },
            { value: false, label: "Libre" },
          ]}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={estado}
          onChange={setEstado}
          style={{ width: 140 }}
          options={[
            { value: true, label: "Activas" },
            { value: false, label: "Inactivas" },
          ]}
        />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setTipo(); setEstado(); setBookable(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Área
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
        title={editing ? "Editar Área Común" : "Nueva Área Común"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={820}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item
              name="nombre"
              label="Nombre"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}
            >
              <Input placeholder="Piscina, Gimnasio, Parrilla..." />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select
                allowClear
                options={[
                  { value: "Gimnasio", label: "Gimnasio" },
                  { value: "Piscina", label: "Piscina" },
                  { value: "Parrilla", label: "Parrilla" },
                  { value: "Sala", label: "Sala de usos múltiples" },
                ]}
                placeholder="Tipo/Categoría"
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Detalles, equipamiento, restricciones…" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="ubicacion" label="Ubicación" style={{ flex: 1 }}>
              <Input placeholder="Torre/Bloque/Piso…" />
            </Form.Item>
            <Form.Item name="aforo" label="Aforo" style={{ width: 180 }}>
              <InputNumber style={{ width: "100%" }} min={0} placeholder="Capacidad" />
            </Form.Item>
            <Form.Item
              name="horario"
              label="Horario"
              tooltip="Rango HH:mm (opcional)"
              style={{ width: 280 }}
            >
              <TimePicker.RangePicker format={timeFmt} />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="requiere_reserva" label="Requiere reserva" valuePropName="checked" style={{ width: 200 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="costo" label="Costo (Bs.)" style={{ width: 200 }}>
              <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
            </Form.Item>
            <Form.Item label="Activo" name="activo" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="reglas" label="Reglas / Políticas">
            <Input.TextArea rows={4} placeholder="Normas de uso, penalidades, horarios especiales…" />
          </Form.Item>

          <Form.Item name="color" label="Color (opcional)" style={{ width: 200 }}>
            <Input placeholder="#03A9F4" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
