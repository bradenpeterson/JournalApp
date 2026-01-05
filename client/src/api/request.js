export async function request(path, { method = 'GET', body, params, headers = {} } = {}) {
  let url = path.startsWith('/') ? path : `${path}`
  if (params) {
    const search = new URLSearchParams(params)
    url += `?${search.toString()}`
  }

  function getCookie(name) {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[2]) : null
  }

  const opts = {
    method,
    credentials: 'include',
    headers: { ...headers },
  }

  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    opts.body = body
  }

  // Add CSRF token for unsafe methods
  const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (unsafeMethods.includes(method.toUpperCase())) {
    const csrftoken = getCookie('csrftoken')
    if (csrftoken) {
      opts.headers['X-CSRFToken'] = csrftoken
    }
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
