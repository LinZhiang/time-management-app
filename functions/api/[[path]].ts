const WORKER_ORIGIN = 'https://time-management-app.806154588.workers.dev'

export async function onRequest(context: { request: Request; env?: { WORKER_ORIGIN?: string } }) {
  const origin = context.env?.WORKER_ORIGIN || WORKER_ORIGIN
  const source = new URL(context.request.url)
  const target = new URL(source.pathname + source.search, origin)
  const method = context.request.method
  const headers = new Headers(context.request.headers)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ipcountry')
  headers.delete('x-forwarded-for')

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    redirect: 'manual',
  }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = context.request.body
    init.duplex = 'half'
  }
  return fetch(target, init)
}
