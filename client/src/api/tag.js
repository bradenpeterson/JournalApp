import { request } from './request'

// Request tag list. Optionally pass `pageSize` to control number of items returned.
export const listTags = (page = 1, pageSize = undefined) => request('/api/tags/', { params: pageSize ? { page, page_size: pageSize } : { page } })

export const getTag = (id) => request(`/api/tags/${id}/`)

export const createTag = (data) => request('/api/tags/', { method: 'POST', body: data })

export const updateTag = (id, data) => request(`/api/tags/${id}/`, { method: 'PUT', body: data })

export const patchTag = (id, data) => request(`/api/tags/${id}/`, { method: 'PATCH', body: data })

export const deleteTag = (id) => request(`/api/tags/${id}/`, { method: 'DELETE' })
