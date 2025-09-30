// src/services/propietarios.js
import { api } from '@/services/api'

const PATH = '/propietarios/'; // tu router DRF expone .../propietarios/

const fromRow = (r) => ({
  id: r.id,
  estado: r.estado,                 // 'activo' | 'inactivo'
  usuario: r.usuario,               // id del User
  usuario_data: r.usuario_data || { // viene de tu serializer
    id: r.usuario,
    username: '',
    first_name: '',
    last_name: '',
    email: '',
  },
  created_at: r.created_at,
})

export async function listPropietarios(params = {}) {
  const { data } = await api.get(PATH, { params }) // OJO: PATH termina en '/'
  const items = Array.isArray(data) ? data : (data.results || [])
  return {
    count: Array.isArray(data) ? items.length : (data.count ?? items.length),
    results: items.map(fromRow),
  }
}

export async function createPropietario({ usuario, estado = 'activo' }) {
  // Tu serializer espera: { usuario, estado }
  const { data } = await api.post(PATH, { usuario, estado })
  return fromRow(data)
}

export async function updatePropietario(id, { usuario, estado }) {
  const { data } = await api.put(`${PATH}${id}/`, { usuario, estado })
  return fromRow(data)
}

export async function deletePropietario(id) {
  await api.delete(`${PATH}${id}/`)
}