import { request } from './request'

export const listEntries = ({ page = 1, search = '', date, start_date, end_date, tags, mood } = {}) => {
  const params = { page }
  if (search) params.search = search
  if (date) params.date = date
  if (start_date) params.start_date = start_date
  if (end_date) params.end_date = end_date
  if (tags) params.tags = tags
  if (mood) params.mood = mood
  return request('/api/entries/', { params })
}

export const getEntriesByDate = (date) =>
  listEntries({ date }).then(res => res.results || res)

export const getEntriesByMonthDay = (monthDay) => {
  // monthDay format: "11-29" (month-day)
  return request('/api/entries/', { params: { month_day: monthDay } })
    .then(res => {
      const entries = res.results || res
      return Array.isArray(entries) ? entries.slice(0, 5) : []
    })
}

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

export const getStats = () => request('/api/entries/stats/')
