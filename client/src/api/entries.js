import { request } from './Request'

export const listEntries = ({ page = 1, search = '', date } = {}) => {
  const params = { page }
  if (search) params.search = search
  if (date) params.date = date
  return request('/api/entries/', { params })
}

export const getEntriesByDate = (date) =>
  listEntries({ date }).then(res => res.results || res)

export const getEntry = (id) => request(`/api/entries/${id}/`)

export const createEntry = (data) => request('/api/entries/', { method: 'POST', body: data })

export const updateEntry = (id, data) => request(`/api/entries/${id}/`, { method: 'PUT', body: data })

export const patchEntry = (id, data) => request(`/api/entries/${id}/`, { method: 'PATCH', body: data })

export const deleteEntry = (id) => request(`/api/entries/${id}/`, { method: 'DELETE' })

export const uploadEntryImage = (id, file) => {
  const formData = new FormData()
  formData.append('image', file)
  return request(`/api/entries/${id}/`, { method: 'PATCH', body: formData })
}
