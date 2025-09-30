// src/pages/Finanzas/Facturas/generarfactura.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Table, Button, Space, Typography, Form, Input, InputNumber,
  DatePicker, Select, message, Popconfirm
} from "antd";
import dayjs from "dayjs";
import {
  createFactura, updateFactura, listFacturas, downloadFacturaPDF
} from "@/services/facturas";
// Si tienes búsquedas de residentes/unidades, impórtalas. Como fallback, campos libres.
import { searchUnidades } from "@/services/unidades";     // (ya lo usamos en otras pantallas)
import { listResidentes } from "@/services/residentes";   // si no existe, puedes omitirlo

const { TextArea } = Input;
const fmt = "YYYY-MM-DD";

export default function GenerarFactura({ facturaId = null }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ key: 1, descripcion: "", cantidad: 1, precio: 0, total: 0 }]);

  // selects (opcionales)
  const [uniOpts, setUniOpts] = useState([]);
  const [cliOpts, setCliOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [cliLoading, setCliLoading] = useState(false);

  async function fetchUnidades(term = "") {
    try {
      setUniLoading(true);
      const res = await searchUnidades({ page: 1, page_size: 20, search: term || undefined });
      setUniOpts((res || []).map((u) => ({ value: u.id, label: u.label ?? String(u.id) })));
    } catch { /* noop */ }
    finally { setUniLoading(false); }
  }
  async function fetchClientes(term = "") {
    try {
      setCliLoading(true);
      const res = await listResidentes?.({ page: 1, page_size: 20, search: term || undefined });
      const arr = res?.results || res || [];
      setCliOpts(arr.map((c) => ({ value: c.id ?? c.uuid ?? c.dni ?? c.ci, label: c.nombre ?? c.nombre_completo ?? String(c.id) })));
    } catch { setCliOpts([]); }
    finally { setCliLoading(false); }
  }

  const columns = useMemo(() => [
    {
      title: "Descripción",
      dataIndex: "descripcion",
      render: (_, r, idx) => (
        <Input
          value={r.descripcion}
          onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
          placeholder="Detalle del servicio/concepto"
        />
      )
    },
    {
      title: "Cant.",
      dataIndex: "cantidad",
      width: 100,
      render: (_, r, idx) => (
        <InputNumber
          min={1}
          value={r.cantidad}
          onChange={(v) => updateItem(idx, { cantidad: Number(v || 1) })}
          style={{ width: "100%" }}
        />
      )
    },
    {
      title: "Precio",
      dataIndex: "precio",
      width: 140,
      render: (_, r, idx) => (
        <InputNumber
          min={0}
          value={r.precio}
          onChange={(v) => updateItem(idx, { precio: Number(v || 0) })}
          style={{ width: "100%" }}
        />
      )
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 140,
      render: (_, r) => (Number(r.total || 0)).toFixed(2)
    },
    {
      title: "",
      width: 80,
      render: (_, __, idx) => (
        <Popconfirm title="Eliminar ítem" onConfirm={() => removeItem(idx)}>
          <a>Eliminar</a>
        </Popconfirm>
      )
    }
  ], [items]);

  function updateItem(idx, patch) {
    setItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[idx], ...patch };
      it.total = Number(it.cantidad || 0) * Number(it.precio || 0);
      copy[idx] = it;
      return copy;
    });
  }
  function addItem() {
    setItems((prev) => [...prev, { key: Date.now(), descripcion: "", cantidad: 1, precio: 0, total: 0 }]);
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Calcula totales a partir de items, impuesto (%) y descuento */
  function calcTotals(values) {
    const subtotal = items.reduce((acc, it) => acc + Number(it.total || 0), 0);
    const impPct = Number(values?.impuesto_pct ?? 0);
    const impuesto = +(subtotal * (impPct / 100)).toFixed(2);
    const descuento = Number(values?.descuento ?? 0);
    const total = +(subtotal + impuesto - descuento).toFixed(2);
    return { subtotal, impuesto, descuento, total };
  }

  /** Carga valores por defecto */
  useEffect(() => {
    fetchUnidades();
    fetchClientes();
    form.setFieldsValue({
      fecha_emision: dayjs(),
      fecha_vencimiento: dayjs().add(7, "day"),
      moneda: "BOB",
      impuesto_pct: 0,
      descuento: 0,
      cliente_tipo: "RESIDENTE",
    });
  }, []);

  async function onSubmit() {
    try {
      const v = await form.validateFields();
      const { subtotal, impuesto, descuento, total } = calcTotals(v);
      const payload = {
        ...v,
        fecha_emision: v.fecha_emision?.format(fmt),
        fecha_vencimiento: v.fecha_vencimiento?.format(fmt),
        items,
        subtotal, impuesto, descuento, total,
      };

      setLoading(true);
      let saved;
      if (facturaId) {
        saved = await updateFactura(facturaId, payload);
        message.success("Factura actualizada");
      } else {
        saved = await createFactura(payload);
        message.success("Factura creada");
      }
      setLoading(false);

      // ofrecer descarga PDF si tu backend lo soporta
      try {
        const blob = await downloadFacturaPDF(saved.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `factura_${saved.numero || saved.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch { /* si no hay PDF, no pasa nada */ }
    } catch (e) {
      setLoading(false);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Error al guardar";
      message.error(msg);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title="Generar factura" bordered>
        <Form form={form} layout="vertical" onValuesChange={() => form.validateFields()}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Space wrap style={{ width: "100%" }}>
              <Form.Item name="cliente_tipo" label="Tipo de cliente" style={{ width: 200 }}>
                <Select
                  options={[
                    { value: "RESIDENTE", label: "Residente" },
                    { value: "PROPIETARIO", label: "Propietario" },
                    { value: "EXTERNO", label: "Externo" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="cliente_id" label="Cliente (ID)" tooltip="Puedes escribir o elegir de la lista" style={{ width: 240 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="ID / buscar"
                  filterOption={false}
                  onSearch={(t) => fetchClientes(t)}
                  loading={cliLoading}
                  options={cliOpts}
                />
              </Form.Item>

              <Form.Item name="cliente_nombre" label="Cliente (nombre)" style={{ minWidth: 260, flex: 1 }}>
                <Input placeholder="Nombre del cliente" />
              </Form.Item>

              <Form.Item name="unidad" label="Unidad" style={{ width: 250 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Buscar unidad"
                  onSearch={(t) => fetchUnidades(t)}
                  filterOption={false}
                  loading={uniLoading}
                  options={uniOpts}
                />
              </Form.Item>
            </Space>

            <Space wrap style={{ width: "100%" }}>
              <Form.Item name="fecha_emision" label="Fecha de emisión" style={{ width: 220 }}
                rules={[{ required: true, message: "Requerido" }]}>
                <DatePicker style={{ width: "100%" }} format={fmt} />
              </Form.Item>

              <Form.Item name="fecha_vencimiento" label="Fecha de vencimiento" style={{ width: 220 }}
                rules={[{ required: true, message: "Requerido" }]}>
                <DatePicker style={{ width: "100%" }} format={fmt} />
              </Form.Item>

              <Form.Item name="moneda" label="Moneda" style={{ width: 160 }}>
                <Select
                  options={[
                    { value: "BOB", label: "BOB" },
                    { value: "USD", label: "USD" },
                  ]}
                />
              </Form.Item>

              <Form.Item name="impuesto_pct" label="Impuesto %" tooltip="Porcentaje aplicado al subtotal" style={{ width: 180 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item name="descuento" label="Descuento (monto)" style={{ width: 200 }}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Space>

            <Card size="small" title="Detalle de ítems" extra={<Button onClick={addItem}>Agregar ítem</Button>}>
              <Table
                rowKey={(r, idx) => r.key ?? idx}
                columns={columns}
                dataSource={items}
                pagination={false}
                bordered
              />
            </Card>

            {/* Totales */}
            <Totals form={form} items={items} calcTotals={calcTotals} />

            <Form.Item name="notas" label="Notas">
              <TextArea rows={3} placeholder="Observaciones visibles en la factura" />
            </Form.Item>

            <Space>
              <Button type="primary" onClick={onSubmit} loading={loading}>
                {facturaId ? "Guardar cambios" : "Generar factura"}
              </Button>
            </Space>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

/* ------- Totales (componente de solo lectura) ------- */
function Totals({ form, items, calcTotals }) {
  const [vals, setVals] = useState({});
  useEffect(() => {
    const sub = form.subscribe?.(() => setVals(form.getFieldsValue())) || null;
    setVals(form.getFieldsValue());
    return () => sub?.unsubscribe?.();
  }, [form, items]);
  const { subtotal, impuesto, descuento, total } = calcTotals(vals);
  return (
    <Card size="small" style={{ maxWidth: 520, marginLeft: "auto" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text>Subtotal:</Typography.Text>
        <Typography.Text strong>{subtotal.toFixed(2)}</Typography.Text>
      </Space>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text>Impuesto:</Typography.Text>
        <Typography.Text strong>{impuesto.toFixed(2)}</Typography.Text>
      </Space>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text>Descuento:</Typography.Text>
        <Typography.Text strong>{Number(descuento || 0).toFixed(2)}</Typography.Text>
      </Space>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text>Total:</Typography.Text>
        <Typography.Text strong>{total.toFixed(2)}</Typography.Text>
      </Space>
    </Card>
  );
}
