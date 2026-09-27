import { createApp } from '../../server/app.ts'
import { createKvRunner, createMemoryRunner } from '../../server/store-kv.ts'

interface KVNamespace {
  get(key: string, options: { type: 'json' }): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

interface WorkerBinding {
  fetch(request: Request): Promise<Response>
}

const WORKER_ORIGIN = 'https://time-management-app.1806154588.workers.dev'

function isKv(value: unknown): value is KVNamespace {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as KVNamespace).get === 'function' &&
      typeof (value as KVNamespace).put === 'function',
  )
}

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
  env?: { STORE?: KVNamespace; API?: WorkerBinding }
}) {
  try {
    const proxied = await proxyToWorker(context.request.clone(), context.env?.API)
    if (proxied.status < 500) return proxied
    console.error('[api] worker 返回', proxied.status)
  } catch (error) {
    console.error('[api] worker 代理失败', error)
  }

  try {
    const runner = isKv(context.env?.STORE) ? createKvRunner(context.env.STORE) : createMemoryRunner()
    return await createApp(runner).fetch(context.request)
  } catch (error) {
    console.error(error)
    return Response.json({ error: '服务器异常，请稍后重试' }, { status: 500 })
  }
}
