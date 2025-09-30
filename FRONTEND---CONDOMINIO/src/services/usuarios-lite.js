// src/services/usuarios-lite.js
import { api } from '@/services/api'

// Ajusta la ruta a tu endpoint real de usuarios (DRF de tu app accounts)
const USERS_PATH = '/accounts/users/'; // o '/users/'

export async function searchUsuarios({ page = 1, page_size = 20, search = '' } = {}) {
  const { data } = await api.get(USERS_PATH, { params: { page, page_size, search } })
  const items = Array.isArray(data) ? data : (data.results || [])
  return items.map(u => ({
    value: u.id,
    label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `user-${u.id}`,
    raw: u
  }))
}