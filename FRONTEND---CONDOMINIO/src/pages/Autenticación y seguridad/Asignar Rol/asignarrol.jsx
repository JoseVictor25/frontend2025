import React, { useState, useEffect } from "react";
import {
  Form,
  InputNumber,
  Popconfirm,
  Table,
  Typography,
  Button,
  Space,
} from "antd";

import {
  listAsignaciones,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion,
} from "../../../services/asignarRol"; // 👈 ojo la ruta

const EditableCell = ({ editing, dataIndex, title, children, ...restProps }) => (
  <td {...restProps}>
    {editing ? (
      <Form.Item
        name={dataIndex}
        style={{ margin: 0 }}
        rules={[{ required: true, message: `Por favor ingresa ${title}!` }]}
      >
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>
    ) : (
      children
    )}
  </td>
);

const AsignarRol = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [editingKey, setEditingKey] = useState("");

  // Cargar asignaciones del backend al inicio
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const lista = await listAsignaciones();
      setData(lista);
    } catch (err) {
      console.error("Error al cargar asignaciones:", err);
    }
  };

  const isEditing = (record) => record.id === editingKey;

  const edit = (record) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.id);
  };

  const cancel = () => setEditingKey("");

  const save = async (id) => {
    try {
      const row = await form.validateFields();
      if (id) {
        await updateAsignacion(id, row); // actualizar
      } else {
        await createAsignacion(row); // crear
      }
      await cargarDatos(); // refrescar tabla
      setEditingKey("");
    } catch (error) {
      console.error("Error guardando asignación:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAsignacion(id);
      await cargarDatos();
    } catch (error) {
      console.error("Error eliminando asignación:", error);
    }
  };

  const handleAdd = () => {
    const nuevo = { id: null, usuario_id: null, rol_id: null };
    setData((prev) => [nuevo, ...prev]);
    form.setFieldsValue(nuevo);
    setEditingKey(null);
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: "12%" },
    { title: "USUARIO_ID", dataIndex: "usuario_id", editable: true },
    { title: "ROL_ID", dataIndex: "rol_id", editable: true },
    {
      title: "Acción",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Typography.Link onClick={() => save(record.id)}>Guardar</Typography.Link>
            <Popconfirm title="Cancelar cambios?" onConfirm={cancel}>
              <a>Cancelar</a>
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Typography.Link disabled={editingKey !== ""} onClick={() => edit(record)}>
              Editar
            </Typography.Link>
            <Popconfirm
              title="¿Seguro que deseas eliminar?"
              onConfirm={() => handleDelete(record.id)}
            >
              <a>Eliminar</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) =>
    col.editable
      ? {
          ...col,
          onCell: (record) => ({
            record,
            dataIndex: col.dataIndex,
            title: col.title,
            editing: isEditing(record),
          }),
        }
      : col
  );

  return (
    <Form form={form} component={false}>
      <Button
        onClick={handleAdd}
        type="primary"
        style={{ marginBottom: 16 }}
        disabled={editingKey !== ""}
      >
        Asignar Rol
      </Button>
      <Table
        components={{ body: { cell: EditableCell } }}
        bordered
        dataSource={data}
        rowKey="id"
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={{ pageSize: 5, onChange: cancel }}
      />
    </Form>
  );
};

export default AsignarRol;
