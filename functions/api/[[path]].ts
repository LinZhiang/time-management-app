import { createApp } from '../../server/app.ts'
import { createKvRunner, createMemoryRunner } from '../../server/store-kv.ts'

interface KVNamespace {
  get(key: string, options: { type: 'json' }): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

export async function onRequest(context: {
  request: Request
  env?: { STORE?: KVNamespace }
}) {
  const runner = context.env?.STORE ? createKvRunner(context.env.STORE) : createMemoryRunner()
  return createApp(runner).fetch(context.request)
}
