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

export const listTags = (page = 1) => request('/api/tags/', { params: { page } })

export const getTag = (id) => request(`/api/tags/${id}/`)

export const createTag = (data) => request('/api/tags/', { method: 'POST', body: data })

export const updateTag = (id, data) => request(`/api/tags/${id}/`, { method: 'PUT', body: data })

export const deleteTag = (id) => request(`/api/tags/${id}/`, { method: 'DELETE' })
