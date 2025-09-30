// src/pages/Operaciones/Bitacora/bitacora.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Typography, Popconfirm, Modal, Form,
  Input, message, Tag, Select, DatePicker
} from "antd";
import dayjs from "dayjs";
import {
  listBitacora, createBitacora, updateBitacora, deleteBitacora, setEstadoBitacora
} from "@/services/bitacora";
import { searchUnidades } from "@/services/unidades";
import { listAreas } from "@/services/areas_comunes";
import { listTareas } from "@/services/tareas_mantenimiento";
import { listIncidentes } from "@/services/incidentes";
import { listPersonal } from "@/services/personal";

const { RangePicker } = DatePicker;
const fmt = "YYYY-MM-DD";

const TIPOS = ["OPERATIVO","SEGURIDAD","LIMPIEZA","MANTENIMIENTO","INCIDENTE"].map(v => ({ value: v, label: v }));
const ESTADOS = ["ABIERTO","CERRADO"].map(v => ({ value: v, label: v }));
const TURNOS = ["MAÑANA","TARDE","NOCHE"].map(v => ({ value: v, label: v }));

export default function Bitacora() {
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
  const [turno, setTurno] = useState();
  const [autor, setAutor] = useState();
  const [unidad, setUnidad] = useState();
  const [area, setArea] = useState();
  const [range, setRange] = useState([dayjs(), dayjs()]);

  // lookups
  const [uniOpts, setUniOpts] = useState([]);
  const [areaOpts, setAreaOpts] = useState([]);
  const [tareaOpts, setTareaOpts] = useState([]);
  const [inciOpts, setInciOpts] = useState([]);
  const [autorOpts, setAutorOpts] = useState([]);
  const [lookLoading, setLookLoading] = useState(false);

  async function fetchLookups(term = "") {
    setLookLoading(true);
    try {
      const u = await searchUnidades?.({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((u || []).map(x => ({ value: x.id, label: x.label ?? String(x.id) })));
    } catch {}
    try {
      const a = await listAreas?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = a?.results || a || [];
      setAreaOpts(arr.map(x => ({ value: x.id, label: x.nombre || `Área ${x.id}` })));
    } catch {}
    try {
      const t = await listTareas?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = t?.results || t || [];
      setTareaOpts(arr.map(x => ({ value: x.id, label: x.titulo || x.codigo || `Tarea ${x.id}` })));
    } catch {}
    try {
      const i = await listIncidentes?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = i?.results || i || [];
      setInciOpts(arr.map(x => ({ value: x.id, label: x.titulo || `Incidente ${x.id}` })));
    } catch {}
    try {
      const p = await listPersonal?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = p?.results || p || [];
      setAutorOpts(arr.map(x => ({ value: x.id, label: `${x.nombres || ""} ${x.apellidos || ""}`.trim() || `Pers. ${x.id}` })));
    } catch {}
    setLookLoading(false);
  }

  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize };
    if (q?.trim()) params.search = q.trim();
    if (tipo) params.tipo = tipo;
    if (estado) params.estado = estado;
    if (turno) params.turno = turno;
    if (autor) params.autor = autor;
    if (unidad) params.unidad = unidad;
    if (area) params.area = area;
    if (range?.length === 2 && range[0] && range[1]) {
      params.desde = range[0].format(fmt);
      params.hasta = range[1].format(fmt);
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listBitacora(buildParams(page, pageSize));
      setData(res.results || []);
      setPag({ pageSize, current: page, total: res.count || 0 });
    } catch (e) { console.error(e); message.error("No se pudo cargar la bitácora"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLookups(); fetchData(1, pag.pageSize); /* eslint-disable-line */ }, []);

  const columns = useMemo(() => [
    { title: "Fecha", dataIndex: "fecha", width: 120, render: v => v || "-" },
    { title: "Hora", dataIndex: "hora", width: 90, render: v => v || "-" },
    { title: "Turno", dataIndex: "turno", width: 120, render: v => v || "-" },
    { title: "Tipo", dataIndex: "tipo", width: 160, render: v => v || "-" },
    { title: "Título", dataIndex: "titulo", ellipsis: true, render: v => v || "-" },
    { title: "Autor", dataIndex: "autor", width: 200, render: v => v || "-" },
    { title: "Unidad", dataIndex: "unidad", width: 110, render: v => v ? <Tag color="blue">{String(v)}</Tag> : "-" },
    { title: "Área", dataIndex: "area", width: 110, render: v => v ? <Tag color="purple">{String(v)}</Tag> : "-" },
    {
      title: "Estado", dataIndex: "estado", width: 120,
      render: v => <Tag color={(v||"").toUpperCase()==="CERRADO" ? "green" : "gold"}>{v || "-"}</Tag>
    },
    {
      title: "Acción", width: 380,
      render: (_, r) => (
        <Space>
          <Typography.Link onClick={() => openEdit(r)}>Editar</Typography.Link>
          {r.estado !== "CERRADO" && <Typography.Link onClick={() => cerrar(r)}>Cerrar</Typography.Link>}
          {r.adjunto_url && <a href={r.adjunto_url} target="_blank" rel="noreferrer">Adjunto</a>}
          <DetalleBtn row={r} />
          <Popconfirm title="¿Eliminar entrada?" onConfirm={() => handleDelete(r.id)}>
            <a>Eliminar</a>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    const now = dayjs();
    form.setFieldsValue({
      fecha: now,
      hora: now.format("HH:mm"),
      turno: "MAÑANA",
      tipo: "OPERATIVO",
      estado: "ABIERTO",
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      fecha: row.fecha ? dayjs(row.fecha) : null,
      hora: row.hora || "",
      turno: row.turno,
      tipo: row.tipo,
      titulo: row.titulo,
      descripcion: row.descripcion,
      autor: row.autor,
      estado: row.estado,
      unidad: row.unidad,
      area: row.area,
      tarea_id: row.tarea_id,
      incidente_id: row.incidente_id,
      adjunto_url: row.adjunto_url,
      notas: row.notas,
    });
    setModalOpen(true);
  }

  async function handleOk() {
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        fecha: v.fecha ? v.fecha.format(fmt) : undefined,
      };
      if (editing) {
        await updateBitacora(editing.id, payload);
        message.success("Entrada actualizada");
      } else {
        await createBitacora(payload);
        message.success("Entrada creada");
      }
      setModalOpen(false);
      fetchData(pag.current, pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  async function cerrar(row) {
    try {
      await setEstadoBitacora(row.id, "CERRADO");
      message.success("Entrada cerrada");
      fetchData(pag.current, pag.pageSize);
    } catch { message.error("No se pudo cerrar"); }
  }

  async function handleDelete(id) {
    try {
      await deleteBitacora(id);
      message.success("Eliminada");
      const next = pag.total - 1;
      const last = Math.max(1, Math.ceil(next / pag.pageSize));
      fetchData(Math.min(pag.current, last), pag.pageSize);
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "No se pudo eliminar";
      message.error(msg);
    }
  }

  function exportCSV() {
    const headers = ["Fecha","Hora","Turno","Tipo","Título","Autor","Unidad","Área","Estado"];
    const rows = data.map(r => [
      r.fecha || "", r.hora || "", r.turno || "", r.tipo || "", (r.titulo || "").replace(/[\r\n]+/g," "),
      (r.autor || "").toString().replace(/[\r\n]+/g," "), r.unidad || "", r.area || "", r.estado || ""
    ]);
    const csv = [headers, ...rows].map(a => a.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bitacora_${range?.[0]?.format(fmt) || "desde"}-${range?.[1]?.format(fmt) || "hasta"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Filtros */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Buscar título / descripción" allowClear value={q} onChange={(e)=>setQ(e.target.value)} onSearch={() => fetchData(1, pag.pageSize)} style={{ width: 280 }} />
        <Select placeholder="Tipo" allowClear value={tipo} onChange={setTipo} style={{ width: 180 }} options={TIPOS} />
        <Select placeholder="Estado" allowClear value={estado} onChange={setEstado} style={{ width: 160 }} options={ESTADOS} />
        <Select placeholder="Turno" allowClear value={turno} onChange={setTurno} style={{ width: 160 }} options={TURNOS} />
        <Select showSearch allowClear placeholder="Autor" value={autor} onChange={setAutor}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 220 }} options={autorOpts} />
        <Select showSearch allowClear placeholder="Unidad" value={unidad} onChange={setUnidad}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={uniOpts} />
        <Select showSearch allowClear placeholder="Área común" value={area} onChange={setArea}
          onSearch={(t)=>fetchLookups(t)} filterOption={false} loading={lookLoading} style={{ minWidth: 200 }} options={areaOpts} />
        <RangePicker value={range} onChange={setRange} format={fmt} />
        <Button onClick={() => fetchData(1, pag.pageSize)}>Aplicar filtros</Button>
        <Button onClick={() => { setQ(""); setTipo(); setEstado(); setTurno(); setAutor(); setUnidad(); setArea(); setRange([null,null]); fetchData(1, pag.pageSize); }}>Limpiar</Button>
        <Button onClick={exportCSV}>Exportar CSV</Button>
      </Space>

      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>
        Nueva entrada
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
        title={editing ? "Editar entrada de bitácora" : "Nueva entrada de bitácora"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="fecha" label="Fecha" style={{ width: 220 }} rules={[{ required: true, message: "Requerido" }]}>
              <DatePicker style={{ width: "100%" }} format={fmt} />
            </Form.Item>
            <Form.Item name="hora" label="Hora" style={{ width: 140 }} rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="HH:mm" />
            </Form.Item>
            <Form.Item name="turno" label="Turno" style={{ width: 200 }}>
              <Select options={TURNOS} />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo" style={{ width: 220 }}>
              <Select options={TIPOS} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: "Requerido" }]}>
            <Input placeholder="Ej: Ronda nocturna / Fuga en piso 3 / Limpieza lobby" />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={4} placeholder="Detalle de lo observado o realizado" />
          </Form.Item>

          <Space.Compact block>
            <Form.Item name="autor" label="Autor" style={{ width: 280 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={autorOpts} />
            </Form.Item>
            <Form.Item name="estado" label="Estado" style={{ width: 200 }}>
              <Select options={ESTADOS} />
            </Form.Item>
            <Form.Item name="adjunto_url" label="Adjunto (URL)" style={{ flex: 1 }}>
              <Input placeholder="http(s)://foto o documento" />
            </Form.Item>
          </Space.Compact>

          <Space.Compact block>
            <Form.Item name="unidad" label="Unidad" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={uniOpts} />
            </Form.Item>
            <Form.Item name="area" label="Área común" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={areaOpts} />
            </Form.Item>
            <Form.Item name="tarea_id" label="Tarea" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={tareaOpts} />
            </Form.Item>
            <Form.Item name="incidente_id" label="Incidente" style={{ width: 260 }}>
              <Select showSearch allowClear onSearch={(t)=>fetchLookups(t)} filterOption={false} options={inciOpts} />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones internas" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ---- Detalle en modal rápido ---- */
function DetalleBtn({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Typography.Link onClick={() => setOpen(true)}>Detalle</Typography.Link>
      <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={`Bitácora #${row?.id ?? ""}`} width={720}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <KV k="Fecha" v={`${row.fecha || "-"} ${row.hora || ""}`} />
          <KV k="Turno" v={row.turno || "-"} />
          <KV k="Tipo" v={row.tipo || "-"} />
          <KV k="Título" v={row.titulo || "-"} />
          <KV k="Autor" v={row.autor || "-"} />
          <KV k="Unidad" v={row.unidad || "-"} />
          <KV k="Área" v={row.area || "-"} />
          <KV k="Estado" v={<Tag color={(row.estado||"").toUpperCase()==="CERRADO" ? "green" : "gold"}>{row.estado || "-"}</Tag>} />
          <Typography.Paragraph>{row.descripcion || "-"}</Typography.Paragraph>
          {row.adjunto_url && <a href={row.adjunto_url} target="_blank" rel="noreferrer">Ver adjunto</a>}
          <Space wrap>
            {row.tarea_id && <Tag color="blue">Tarea {row.tarea_id}</Tag>}
            {row.incidente_id && <Tag color="purple">Incidente {row.incidente_id}</Tag>}
          </Space>
        </Space>
      </Modal>
    </>
  );
}
function KV({ k, v }) {
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Typography.Text type="secondary">{k}</Typography.Text>
      {typeof v === "string" || typeof v === "number" ? <Typography.Text>{v}</Typography.Text> : v}
    </Space>
  );
}
