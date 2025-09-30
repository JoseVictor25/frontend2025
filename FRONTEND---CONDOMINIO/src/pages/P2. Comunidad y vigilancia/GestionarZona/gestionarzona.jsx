// src/pages/Comunidad y vigilancia/GestionarZona/gestionarzona.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, message, Tag, Select, Switch, InputNumber, TimePicker
} from "antd";
import dayjs from "dayjs";
import { listZonas, createZona, updateZona, deleteZona } from "@/services/zonas";

const timeFmt = "HH:mm";

export default function GestionarZona() {
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

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Nombre", dataIndex: "nombre" },
    { title: "Tipo", dataIndex: "tipo", render: v => v || "-" },
    { title: "Aforo", dataIndex: "aforo", width: 90, render: v => v ?? "-" },
    { title: "Ubicación", dataIndex: "ubicacion", render: v => v || "-" },
    {
      title: "Horario", width: 180,
      render: (_, r) => {
        const ini = r.horario_inicio || "-";
        const fin = r.horario_fin || "-";
        return `${ini} - ${fin}`;
      }
    },
    {
      title: "Estado", dataIndex: "activo", width: 110,
      render: v => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>)
    },
    {
      title: "Acción", width: 200,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Popconfirm title="¿Eliminar zona?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize, ordering: "-id" };
    if (q?.trim()) params.search = q.trim(); // según tu API puede ser 'q'
    if (tipo) params.tipo = tipo;            // o 'type'
    if (estado !== undefined) params.activo = estado; // true/false
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listZonas(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las zonas");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(1, pag.pageSize); /* eslint-disable-next-line */ }, []);

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
      descripcion: row.descripcion,
      tipo: row.tipo,
      aforo: row.aforo,
      activo: !!row.activo,
      ubicacion: row.ubicacion,
      horario: (row.horario_inicio && row.horario_fin)
        ? [dayjs(row.horario_inicio, timeFmt), dayjs(row.horario_fin, timeFmt)]
        : undefined,
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
        await updateZona(editing.id, payload);
        message.success("Zona actualizada");
      } else {
        await createZona(payload);
        message.success("Zona creada");
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
      await deleteZona(id);
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
            { value: "Sala", label: "Sala" },
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
        <Button onClick={() => { setQ(""); setTipo(); setEstado(); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Zona
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
        title={editing ? "Editar Zona" : "Nueva Zona"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={760}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item
              name="nombre"
              label="Nombre"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}
            >
              <Input placeholder="Ej: Gimnasio, Piscina, Parrilla…" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select
                allowClear
                options={[
                  { value: "Gimnasio", label: "Gimnasio" },
                  { value: "Piscina", label: "Piscina" },
                  { value: "Parrilla", label: "Parrilla" },
                  { value: "Sala", label: "Sala" },
                ]}
                placeholder="Tipo/Categoría"
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Detalles, normas, etc." />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="aforo" label="Aforo" style={{ width: 180 }}>
              <InputNumber style={{ width: "100%" }} min={0} placeholder="Capacidad" />
            </Form.Item>
            <Form.Item name="ubicacion" label="Ubicación" style={{ flex: 1 }}>
              <Input placeholder="Torre/Bloque/Piso…" />
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
            <Form.Item name="color" label="Color (opcional)" style={{ width: 200 }}>
              <Input placeholder="#03A9F4" />
            </Form.Item>
            <Form.Item label="Activo" name="activo" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </div>
  );
}
