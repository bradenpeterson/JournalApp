async function request(path, { method = 'GET', body, params, headers = {} } = {}) {
  let url = path.startsWith('/') ? path : `${path}`
  if (params) {
    const search = new URLSearchParams(params)
    url += `?${search.toString()}`
  }

  const opts = {
    method,
    credentials: 'same-origin',
    headers: { ...headers },
  }

  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    opts.body = body
  }

  const res = await fetch(url, opts)
  const contentType = res.headers.get('content-type') || ''
  
  if (!res.ok) {
    const errData = contentType.includes('application/json') ? await res.json() : null
    throw { status: res.status, data: errData }
  }

  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res
}

export const listEntries = (page = 1, search = '') => {
  const params = { page }
  if (search) params.search = search
  return request('/api/entries/', { params })
}

export const getEntry = (id) => request(`/api/entries/${id}/`)

export const createEntry = (data) => request('/api/entries/', { method: 'POST', body: data })

export const updateEntry = (id, data) => request(`/api/entries/${id}/`, { method: 'PUT', body: data })

export const deleteEntry = (id) => request(`/api/entries/${id}/`, { method: 'DELETE' })

export const uploadEntryImage = (id, file) => {
  const formData = new FormData()
  formData.append('image', file)
  return request(`/api/entries/${id}/`, { method: 'PATCH', body: formData })
}
