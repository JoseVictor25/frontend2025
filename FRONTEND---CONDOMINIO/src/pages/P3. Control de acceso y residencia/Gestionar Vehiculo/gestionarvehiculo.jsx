import React, { useEffect, useState, createContext, useContext } from "react";
import { Form, Input, Popconfirm, Table, Typography, Button, Space, message, Select } from "antd";
import { listVehiculos, createVehiculo, updateVehiculo, deleteVehiculo } from "@/services/vehiculos";

const { Option } = Select;
const EditableContext = createContext(null);

const EditableRow = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const form = useContext(EditableContext);
  let inputNode = <Input />;

  if (dataIndex === "estado") {
    inputNode = (
      <Select>
        <Option value="ACTIVO">ACTIVO</Option>
        <Option value="INACTIVO">INACTIVO</Option>
        <Option value="BLOQUEADO">BLOQUEADO</Option>
      </Select>
    );
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: dataIndex !== "modelo" && dataIndex !== "color", message: `Ingrese ${title}` }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export default function GestionarVehiculo() {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState("");

  const isEditing = (record) => record.id === editingKey;

  async function fetchVehiculos() {
    setLoading(true);
    try {
      const res = await listVehiculos();
      const items = Array.isArray(res) ? res : (res.results || []);
      setData(items);
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar vehículos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const edit = (record) => {
    form.setFieldsValue({
      placa: "",
      marca: "",
      modelo: "",
      color: "",
      estado: "ACTIVO",
      ...record,
    });
    setEditingKey(record.id);
  };

  const cancel = () => setEditingKey("");

  const save = async (id) => {
    try {
      const row = await form.validateFields();
      await updateVehiculo(id, row);
      message.success("Vehículo actualizado");
      setEditingKey("");
      fetchVehiculos();
    } catch (err) {
      console.error(err);
      message.error("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteVehiculo(id);
      message.success("Eliminado");
      fetchVehiculos();
    } catch (e) {
      console.error(e);
      message.error("No se pudo eliminar");
    }
  };

  const columns = [
    { title: "Placa", dataIndex: "placa", width: "15%", editable: true },
    { title: "Marca", dataIndex: "marca", width: "15%", editable: true },
    { title: "Modelo", dataIndex: "modelo", width: "15%", editable: true },
    { title: "Color", dataIndex: "color", width: "15%", editable: true },
    { title: "Estado", dataIndex: "estado", width: "10%", editable: true },
    {
      title: "Acción",
      dataIndex: "accion",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link onClick={() => save(record.id)} style={{ marginRight: 8 }}>
              Guardar
            </Typography.Link>
            <Popconfirm title="Cancelar cambios?" onConfirm={cancel}>
              <a>Cancelar</a>
            </Popconfirm>
          </span>
        ) : (
          <Space>
            <Typography.Link disabled={editingKey !== ""} onClick={() => edit(record)}>
              Editar
            </Typography.Link>
            <Popconfirm title="¿Seguro que deseas eliminar?" onConfirm={() => handleDelete(record.id)}>
              <a>Eliminar</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) return col;
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const onCreate = async (values) => {
    try {
      await createVehiculo(values);
      message.success("Vehículo creado");
      form.resetFields();
      fetchVehiculos();
    } catch (e) {
      console.error(e);
      message.error("Error al crear vehículo");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Gestionar Vehículos</Typography.Title>

      {/* Form de creación rápida */}
      <Form layout="inline" onFinish={onCreate} style={{ marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <Form.Item name="placa" rules={[{ required: true, message: "Placa requerida" }]}>
          <Input placeholder="Placa" />
        </Form.Item>
        <Form.Item name="marca" rules={[{ required: true, message: "Marca requerida" }]}>
          <Input placeholder="Marca" />
        </Form.Item>
        <Form.Item name="modelo">
          <Input placeholder="Modelo" />
        </Form.Item>
        <Form.Item name="color">
          <Input placeholder="Color" />
        </Form.Item>
        {/* IMPORTANTE: tu backend requiere unidad_habitacional (UUID) */}
        <Form.Item name="unidad_habitacional" rules={[{ required: true, message: "UUID de unidad requerido" }]}>
          <Input placeholder="Unidad (UUID)" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Guardar</Button>
        </Form.Item>
      </Form>

      <Form form={form} component={false}>
        <Table
          components={{ body: { row: EditableRow, cell: EditableCell } }}
          bordered
          loading={loading}
          dataSource={data}
          rowKey="id"
          columns={mergedColumns}
          pagination={{ pageSize: 10 }}
        />
      </Form>
    </div>
  );
}
