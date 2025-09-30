// src/pages/Autenticación y seguridad/ReconocimientoFacial/reconocimientofacial.jsx

import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message } from "antd";
import { listEvents, identifyFace, verifyFace } from "@/services/reconocimiento";
import dayjs from "dayjs";

export default function GestionarReconocimientoFacial() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar eventos de acceso
  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await listEvents();
      setData(res.results || res); // depende de tu paginación
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar los eventos de acceso");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Simular nueva identificación (1:N)
  async function handleIdentify() {
    try {
      const res = await identifyFace({
        image_b64: "fake_base64_image",
        threshold: 0.75,
      });
      message.success("Identificación realizada");
      console.log("identify result:", res);
      fetchEvents();
    } catch (e) {
      console.error(e);
      message.error("Error en identificación");
    }
  }

  // Simular nueva verificación (1:1)
  async function handleVerify() {
    try {
      const res = await verifyFace({
        usuario: 1, // <-- cambia por un usuario real existente
        image_b64: "fake_base64_image",
        threshold: 0.75,
      });
      message.success("Verificación realizada");
      console.log("verify result:", res);
      fetchEvents();
    } catch (e) {
      console.error(e);
      message.error("Error en verificación");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 120 },
    { title: "Método", dataIndex: "metodo" },
    { title: "Usuario", dataIndex: "usuario_username", render: (u) => u || "—" },
    {
      title: "Score",
      dataIndex: "score",
      render: (s) => (s !== null ? s.toFixed(2) : "—"),
    },
    {
      title: "Éxito",
      dataIndex: "exito",
      render: (e) => (
        <Tag color={e ? "green" : "red"}>{e ? "Sí" : "No"}</Tag>
      ),
    },
    { title: "Terminal", dataIndex: "terminal_nombre" },
    {
      title: "Fecha",
      dataIndex: "creado_en",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "—"),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleIdentify}>
          Nueva Identificación
        </Button>
        <Button onClick={handleVerify}>Nueva Verificación</Button>
      </Space>

      <Table
        rowKey="id"
        bordered
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
}