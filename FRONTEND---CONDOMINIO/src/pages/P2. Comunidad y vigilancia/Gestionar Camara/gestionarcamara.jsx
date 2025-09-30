// src/pages/Seguridad/GestionarCamara/gestionarcamaras.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, message, Tag, Select, Switch, InputNumber, Tooltip
} from "antd";
import { listCamaras, createCamara, updateCamara, deleteCamara, activarCamara, testCamara } from "@/services/camaras";
import { listZonas } from "@/services/zonas";

export default function GestionarCamaras() {
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // Zonas para el select
  const [zonaOpts, setZonaOpts] = useState([]);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 90, render: v => (v ? String(v).slice(0, 8) + "…" : "-") },
    { title: "Nombre", dataIndex: "nombre", render: v => v || "-" },
    { title: "IP:Puerto", render: (_, r) => (r.ip ? `${r.ip}${r.puerto ? ":" + r.puerto : ""}` : "-") },
    { title: "Ubicación", dataIndex: "ubicacion", render: v => v || "-" },
    { title: "Zona", dataIndex: "zona", render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Tipo", dataIndex: "tipo", render: v => v || "-" },
    { title: "Fabricante", dataIndex: "fabricante", render: v => v || "-" },
    {
      title: "Estado", dataIndex: "activa", width: 110,
      render: v => (v ? <Tag color="green">Activa</Tag> : <Tag color="red">Inactiva</Tag>)
    },
    {
      title: "Acción", width: 320,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          <Typography.Link onClick={() => toggleActiva(r)}>{r.activa ? "Desactivar" : "Activar"}</Typography.Link>
          <Typography.Link onClick={() => onTest(r)}>Probar</Typography.Link>
          {r.http_url?.startsWith("http") && (
            <a href={r.http_url} target="_blank" rel="noreferrer">Abrir</a>
          )}
          <Popconfirm title="¿Eliminar cámara?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    return { page, page_size: pageSize, ordering: "-id" };
  }

  async function fetchZonas() {
    try {
      const res = await listZonas({ page: 1, page_size: 200, ordering: "nombre" });
      const items = res.results || [];
      setZonaOpts(items.map(z => ({ value: z.id, label: z.nombre || `Zona ${z.id}` })));
    } catch {
      setZonaOpts([]);
    }
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listCamaras(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las cámaras");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchZonas();
    fetchData(1, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ activa: true, puerto: 554 });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      ip: row.ip,
      puerto: row.puerto ?? 554,
      rtsp_url: row.rtsp_url,
      http_url: row.http_url,
      ubicacion: row.ubicacion,
      zona: row.zona,
      activa: !!row.activa,
      tipo: row.tipo,
      fabricante: row.fabricante,
      usuario: row.usuario,
      // password: "" // por seguridad, no rellenar desde backend
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      if (editing) {
        await updateCamara(editing.id, v);
        message.success("Cámara actualizada");
      } else {
        await createCamara(v);
        message.success("Cámara creada");
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
      await deleteCamara(id);
      message.success("Eliminado");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  async function toggleActiva(row) {
    try {
      await activarCamara(row.id, !row.activa);
      message.success(!row.activa ? "Cámara activada" : "Cámara desactivada");
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      message.error("No se pudo cambiar el estado");
    }
  }

  async function onTest(row) {
    try {
      const res = await testCamara(row.id);
      // Respuesta típica: { ok: true, latency_ms: 120, snapshot: "http://..." }
      if (res?.ok) {
        message.success(`OK (${res?.latency_ms ?? "?"} ms)`);
        if (res?.snapshot?.startsWith("http")) window.open(res.snapshot, "_blank");
      } else {
        message.warning("El backend respondió pero no indicó OK");
      }
    } catch (e) {
      console.error(e);
      message.error("No se pudo probar la cámara");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva Cámara
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
        title={editing ? "Editar Cámara" : "Nueva Cámara"}
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
              <Input placeholder="Acceso principal / Lobby / Piscina…" />
            </Form.Item>
            <Form.Item name="zona" label="Zona" style={{ width: 260 }}>
              <Select
                allowClear
                placeholder="Selecciona zona"
                options={zonaOpts}
              />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item
              name="ip"
              label="IP / Host"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Requerido" }]}
            >
              <Input placeholder="192.168.1.20 / camara.local" />
            </Form.Item>
            <Form.Item name="puerto" label="Puerto" style={{ width: 160 }}>
              <InputNumber style={{ width: "100%" }} min={1} max={65535} placeholder="554" />
            </Form.Item>
            <Form.Item label="Activa" name="activa" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="rtsp_url"
            label={(
              <Space>
                <span>RTSP URL</span>
                <Tooltip title="Formato ejemplo: rtsp://usuario:pass@IP:PUERTO/Streaming/Channels/101">
                  <span style={{ color: "#999" }}>ⓘ</span>
                </Tooltip>
              </Space>
            )}
          >
            <Input placeholder="rtsp://usuario:pass@192.168.1.20:554/Streaming/Channels/101" />
          </Form.Item>

          <Form.Item
            name="http_url"
            label={(
              <Space>
                <span>HTTP Snapshot / MJPEG</span>
                <Tooltip title="URL de snapshot JPG o stream MJPEG si tu backend lo usa para test/previsualización">
                  <span style={{ color: "#999" }}>ⓘ</span>
                </Tooltip>
              </Space>
            )}
          >
            <Input placeholder="http://192.168.1.20/jpg/image.jpg" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="ubicacion" label="Ubicación" style={{ flex: 1 }}>
              <Input placeholder="Torre A - Pasillo 3" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo / Modelo" style={{ width: 260 }}>
              <Input placeholder="Domo / Bullet / PTZ, modelo…" />
            </Form.Item>
            <Form.Item name="fabricante" label="Fabricante" style={{ width: 220 }}>
              <Input placeholder="Hikvision / Dahua / Uniview…" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="usuario" label="Usuario" style={{ width: 260 }}>
              <Input placeholder="usuario de la cámara" />
            </Form.Item>
            {/* Si tu API lo requiere, descomenta y maneja con cuidado:
            <Form.Item name="password" label="Contraseña" style={{ width: 260 }}>
              <Input.Password placeholder="********" />
            </Form.Item>
            */}
          </Space.Compact>
        </Form>
      </Modal>
    </div>
  );
}
