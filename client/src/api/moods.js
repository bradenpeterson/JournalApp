import { request } from './request'

export const getMoodByDate = (date) => request('/api/moods/', { params: { date } }).then(res => {
  // endpoint returns list (filtered by date), return first match or null
  const items = res.results || res
  if (Array.isArray(items)) return items.length ? items[0] : null
  return items
})

export const createMood = (data) => request('/api/moods/', { method: 'POST', body: data })
export const updateMood = (id, data) => request(`/api/moods/${id}/`, { method: 'PUT', body: data })
export const patchMood = (id, data) => request(`/api/moods/${id}/`, { method: 'PATCH', body: data })
export const deleteMood = (id) => request(`/api/moods/${id}/`, { method: 'DELETE' })
