import React, { useMemo, useState } from 'react'
import { Form, Select, Popconfirm, Table, Typography, Button, Space, Tag, message } from 'antd'

/**
 * ---------------------------------------------------------------------------
 *  DEMO LOCAL (mock). Sustituye rolesData, permisosData y originData por tu API.
 * ---------------------------------------------------------------------------
 */

// Catálogo de Roles (mock)
const rolesData = [
  { id: 1, nombre: 'ADMIN' },
  { id: 2, nombre: 'GUARDIA' },
  { id: 3, nombre: 'RESIDENTE' },
  { id: 4, nombre: 'VISITANTE' },
]

// Catálogo de Permisos (mock)
const permisosData = [
  { id: 1, nombre: 'usuarios.ver' },
  { id: 2, nombre: 'usuarios.crear' },
  { id: 3, nombre: 'usuarios.editar' },
  { id: 4, nombre: 'usuarios.eliminar' },
  { id: 5, nombre: 'areas.reservar' },
  { id: 6, nombre: 'finanzas.pagar' },
]

// Asignaciones iniciales (mock) -> tabla pivote: id, rol_id, permiso_id
const originData = [
  { key: '1', id: 1, rol_id: 1, permiso_id: 1 },
  { key: '2', id: 2, rol_id: 1, permiso_id: 2 },
  { key: '3', id: 3, rol_id: 1, permiso_id: 3 },
  { key: '4', id: 4, rol_id: 2, permiso_id: 1 },
]

// Helpers
const roleName = (id) => rolesData.find(r => r.id === id)?.nombre || `#${id}`
const permName = (id) => permisosData.find(p => p.id === id)?.nombre || `#${id}`

// Celda editable (usa Select cuando corresponde)
const EditableCell = ({ editing, dataIndex, title, record, children, ...restProps }) => {
  const isRol = dataIndex === 'rol_id'
  const isPerm = dataIndex === 'permiso_id'

  const inputNode = isRol ? (
    <Select
      placeholder="Selecciona un rol"
      options={rolesData.map(r => ({ value: r.id, label: r.nombre }))}
      showSearch
      optionFilterProp="label"
    />
  ) : isPerm ? (
    <Select
      placeholder="Selecciona un permiso"
      options={permisosData.map(p => ({ value: p.id, label: p.nombre }))}
      showSearch
      optionFilterProp="label"
    />
  ) : null

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: `Por favor ingresa ${title}!` }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  )
}

const AsignarPermisoPage = () => {
  const [form] = Form.useForm()
  const [data, setData] = useState(originData)
  const [editingKey, setEditingKey] = useState('')
  const [counter, setCounter] = useState(originData.length + 1)

  const isEditing = (record) => record.key === editingKey

  // Para búsqueda/orden (si luego quieres agregarlo)
  const dataMemo = useMemo(() => data, [data])

  const edit = (record) => {
    form.setFieldsValue({ rol_id: record.rol_id, permiso_id: record.permiso_id })
    setEditingKey(record.key)
  }

  const cancel = () => setEditingKey('')

  const existsDuplicate = (rol_id, permiso_id, exceptKey = null) => {
    return data.some(
      (x) => x.rol_id === rol_id && x.permiso_id === permiso_id && x.key !== exceptKey
    )
  }

  const save = async (key) => {
    try {
      const row = await form.validateFields()
      const newData = [...data]
      const idx = newData.findIndex((item) => key === item.key)

      if (existsDuplicate(row.rol_id, row.permiso_id, key)) {
        message.error('Ya existe esa asignación (rol + permiso).')
        return
      }

      if (idx > -1) {
        newData.splice(idx, 1, { ...newData[idx], ...row })
        setData(newData)
        setEditingKey('')
        message.success('Asignación actualizada')
      }
    } catch (err) {
      console.log('Error:', err)
    }
  }

  const handleDelete = (key) => {
    setData(prev => prev.filter((item) => item.key !== key))
    message.success('Asignación eliminada')
  }

  const handleAdd = () => {
    const temp = {
      key: counter.toString(),
      // id es PK opcional; si en tu backend usas PK compuesta (rol_id + permiso_id),
      // este `id` puede omitirse al enviar. Aquí lo dejamos para tener una PK local.
      id: counter,
      rol_id: undefined,
      permiso_id: undefined,
    }
    setData([temp, ...data])
    setCounter(counter + 1)
    edit(temp)
  }

  const columns = [
    { title: 'ID (opcional)', dataIndex: 'id', width: 120 },
    {
      title: 'Rol',
      dataIndex: 'rol_id',
      width: 260,
      editable: true,
      render: (value) => <Tag>{roleName(value)}</Tag>,
    },
    {
      title: 'Permiso',
      dataIndex: 'permiso_id',
      width: 320,
      editable: true,
      render: (value) => <Tag>{permName(value)}</Tag>,
    },
    {
      title: 'Acción',
      dataIndex: 'accion',
      width: 180,
      render: (_, record) => {
        const editable = isEditing(record)
        return editable ? (
          <Space>
            <Typography.Link onClick={() => save(record.key)}>Guardar</Typography.Link>
            <Popconfirm title="¿Cancelar cambios?" onConfirm={cancel}>
              <a>Cancelar</a>
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>
              Editar
            </Typography.Link>
            <Popconfirm
              title="¿Seguro que deseas eliminar?"
              onConfirm={() => handleDelete(record.key)}
            >
              <a>Eliminar</a>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

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
  )

  return (
    <Form form={form} component={false}>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={handleAdd} type="primary" disabled={editingKey !== ''}>
          Nueva asignación
        </Button>
      </Space>
      <Table
        components={{ body: { cell: EditableCell } }}
        bordered
        dataSource={dataMemo}
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={{ pageSize: 6, onChange: cancel }}
        size="middle"
      />
    </Form>
  )
}

export default AsignarPermisoPage
