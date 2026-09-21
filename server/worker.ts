import type { AppStore } from '../shared/types.ts'
import { createApp } from './app.ts'
import { normalizeStore } from './store-state.ts'

export interface Env {
  APP_STORE: DurableObjectNamespace
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

interface DurableObjectId {
  toString(): string
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put(key: string, value: unknown): Promise<void>
  }
}

export class AppStoreDO {
  ctx: DurableObjectState

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx
  }

  async fetch(request: Request) {
    const app = createApp(async (fn) => {
      const stored = await this.ctx.storage.get<AppStore>('data')
      const store = normalizeStore(stored)
      const result = await fn(store)
      await this.ctx.storage.put('data', store)
      return result
    })
    return app.fetch(request)
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      const id = env.APP_STORE.idFromName('global')
      return env.APP_STORE.get(id).fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
}
