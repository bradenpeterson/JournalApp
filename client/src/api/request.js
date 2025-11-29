export async function request(path, { method = 'GET', body, params, headers = {} } = {}) {
  let url = path.startsWith('/') ? path : `${path}`
  if (params) {
    const search = new URLSearchParams(params)
    url += `?${search.toString()}`
  }

  const opts = {
    method,
    credentials: 'include', // send cookies across origins
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
