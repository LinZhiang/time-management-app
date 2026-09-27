interface WorkerBinding {
  fetch(request: Request): Promise<Response>
}

const WORKER_ORIGIN = 'https://time-management-app.1806154588.workers.dev'

async function proxyToWorker(request: Request, binding?: WorkerBinding) {
  if (binding?.fetch) {
    return binding.fetch(request)
  }
  const url = new URL(request.url)
  const headers = new Headers(request.headers)
  headers.delete('host')
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer()
  return fetch(`${WORKER_ORIGIN}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  })
}

export async function onRequest(context: {
  request: Request
  env?: { API?: WorkerBinding }
}) {
  try {
    return await proxyToWorker(context.request, context.env?.API)
  } catch (error) {
    console.error('[api] worker 代理失败', error)
    return Response.json({ error: '服务器异常，请稍后重试' }, { status: 500 })
  }
}
