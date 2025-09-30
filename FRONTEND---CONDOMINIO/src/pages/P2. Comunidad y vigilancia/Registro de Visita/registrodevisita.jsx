// src/pages/Comunidad y vigilancia/RegistroVisita/registrovisita.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  DatePicker,
  Select,
  Input,
  message,
} from "antd";
import dayjs from "dayjs";
import { listVisitas } from "@/services/visitas";
import { searchUnidades } from "@/services/unidades";

const { RangePicker } = DatePicker;
const fmtDate = "YYYY-MM-DD";
const fmtDateTime = "YYYY-MM-DD HH:mm";

// ===== Helpers para compatibilidad de campos =====
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
function pickDate(r) {
  return r?.fecha || r?.raw?.date || r?.raw?.created_at || "-";
}
function pickIn(r) {
  return r?.hora_entrada || r?.raw?.checkin || r?.raw?.entrada || "-";
}
function pickOut(r) {
  return r?.hora_salida || r?.raw?.checkout || r?.raw?.salida || "-";
}
function pickStatus(r) {
  const v =
    r?.estado ||
    r?.raw?.status ||
    (r?.hora_entrada || r?.raw?.checkin
      ? r?.hora_salida || r?.raw?.checkout
        ? "SALIO"
        : "EN_CASA"
      : "PENDIENTE");
  return v;
}

// ===== CSV utils =====
function toCSV(rows) {
  const headers = [
    "ID",
    "Visitante",
    "Documento",
    "Telefono",
    "Motivo",
    "Unidad",
    "Fecha",
    "Entrada",
    "Salida",
    "Estado",
  ];
  const lines = rows.map((r) => [
    r.id ?? "",
    pickName(r),
    pickDoc(r),
    pickPhone(r),
    r.motivo ?? r?.raw?.motivo ?? r?.raw?.reason ?? "",
    pickUnit(r),
    pickDate(r),
    pickIn(r),
    pickOut(r),
    pickStatus(r),
  ]);
  const escape = (v) =>
    `"${String(v ?? "").replaceAll('"', '""').replaceAll("\n", " ")}"`;
  const csv =
    headers.map(escape).join(",") +
    "\n" +
    lines.map((row) => row.map(escape).join(",")).join("\n");
  return csv;
}

export default function RegistroVisita() {
  // tabla
  const [data, setData] = useState([]);
  const [pag, setPag] = useState({ pageSize: 10, current: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState();
  const [unidad, setUnidad] = useState();
  const [range, setRange] = useState(); // [dayjs, dayjs]

  // unidades select
  const [uniOpts, setUniOpts] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);

  // columns
  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 90, render: (v) => (v ? String(v).slice(0, 8) + "…" : "-") },
      { title: "Visitante", render: (_, r) => pickName(r) },
      { title: "Doc", width: 110, render: (_, r) => pickDoc(r) },
      { title: "Teléfono", width: 120, render: (_, r) => pickPhone(r) },
      {
        title: "Motivo",
        dataIndex: "motivo",
        render: (v, r) => v || r?.raw?.motivo || r?.raw?.reason || "-",
      },
      { title: "Unidad", render: (_, r) => pickUnit(r) },
      { title: "Fecha", width: 120, render: (_, r) => pickDate(r) },
      { title: "Entrada", width: 150, render: (_, r) => pickIn(r) },
      { title: "Salida", width: 150, render: (_, r) => pickOut(r) },
      {
        title: "Estado",
        width: 120,
        render: (_, r) => {
          const v = pickStatus(r);
          const map = { PENDIENTE: "default", EN_CASA: "green", SALIO: "red" };
          return <Tag color={map[v] || "default"}>{v}</Tag>;
        },
      },
    ],
    []
  );

  // fetch unidades
  async function fetchUnidades(term = "") {
    setUniLoading(true);
    try {
      const items = await searchUnidades({
        page: 1,
        page_size: 20,
        search: term || undefined,
        q: term || undefined,
      });
      setUniOpts(items.map((u) => ({ value: u.id, label: u.label })));
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar las unidades");
    } finally {
      setUniLoading(false);
    }
  }

  // armar params según filtros (ajusta nombres si tu API usa otros)
  function buildParams(page = pag.current, pageSize = pag.pageSize) {
    const params = { page, page_size: pageSize, ordering: "-id" };
    if (q?.trim()) params.search = q.trim(); // o 'q' según tu API
    if (estado) params.estado = estado; // o 'status'
    if (unidad) params.unidad = unidad; // o 'unit'
    if (range && range.length === 2) {
      params.fecha_desde = range[0].format(fmtDate);
      params.fecha_hasta = range[1].format(fmtDate);
      // Si tu API usa otros nombres: 'date_from', 'date_to', 'from', 'to'
    }
    return params;
  }

  async function fetchData(page = 1, pageSize = 10) {
    setLoading(true);
    try {
      const res = await listVisitas(buildParams(page, pageSize));
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
    fetchData(1, pag.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cambia filtros
  function onFilterChange() {
    fetchData(1, pag.pageSize);
  }

  // exportar CSV: trae todas las páginas con filtros actuales
  async function exportCSV() {
    try {
      setLoading(true);
      // 1) Trae primera página
      const first = await listVisitas(buildParams(1, 500));
      let rows = first.results || [];
      const total = first.count || rows.length;
      // 2) Si faltan, pide más
      let got = rows.length;
      let page = 2;
      while (got < total) {
        const res = await listVisitas(buildParams(page, 500));
        const chunk = res.results || [];
        rows = rows.concat(chunk);
        got += chunk.length;
        page += 1;
        if (!chunk.length) break; // por si el backend no da más
      }
      // 3) Descargar
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registro_visitas_${dayjs().format("YYYYMMDD_HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`Exportadas ${rows.length} visitas`);
    } catch (e) {
      console.error(e);
      message.error("No se pudo exportar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          format={fmtDate}
          value={range}
          onChange={(v) => setRange(v)}
          allowClear
        />
        <Select
          placeholder="Estado"
          style={{ width: 160 }}
          allowClear
          value={estado}
          onChange={setEstado}
          options={[
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "EN_CASA", label: "En casa" },
            { value: "SALIO", label: "Salió" },
          ]}
        />
        <Select
          showSearch
          placeholder="Unidad"
          style={{ minWidth: 220 }}
          allowClear
          value={unidad}
          onChange={setUnidad}
          onSearch={(t) => fetchUnidades(t)}
          filterOption={false}
          loading={uniLoading}
          options={uniOpts}
        />
        <Input.Search
          placeholder="Buscar visitante / doc / motivo"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={onFilterChange}
          style={{ width: 280 }}
        />
        <Button onClick={onFilterChange}>Aplicar filtros</Button>
        <Button type="default" onClick={() => { setRange(); setEstado(); setUnidad(); setQ(""); fetchData(1, pag.pageSize); }}>
          Limpiar
        </Button>
        <Button type="primary" onClick={exportCSV}>
          Exportar CSV
        </Button>
      </Space>

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
    </div>
  );
}
