import type { AppStore } from '../shared/types.ts'
import { createApp } from './app.ts'
import { RESTORE_SEED } from './restore-seed.ts'
import { mergeStore, normalizeStore, storeHasUserData } from './store-state.ts'

export interface Env {
  APP_STORE: DurableObjectNamespace
  STORE?: {
    get(key: string, options?: { type: 'json' }): Promise<unknown>
    put(key: string, value: string): Promise<void>
  }
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

const KV_KEY = 'app-store'

export class AppStoreDO {
  ctx: DurableObjectState
  env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  async fetch(request: Request) {
    const app = createApp(async (fn) => {
      const stored = await this.ctx.storage.get<AppStore>('data')
      let store = normalizeStore(stored)
      if (!storeHasUserData(store)) {
        if (this.env.STORE) {
          try {
            const backup = await this.env.STORE.get(KV_KEY, { type: 'json' })
            store = mergeStore(store, backup as Partial<AppStore> | undefined)
          } catch (error) {
            console.error('[worker] 读取备份失败', error)
          }
        }
        if (!storeHasUserData(store)) store = mergeStore(store, RESTORE_SEED)
      }
      const result = await fn(store)
      await this.ctx.storage.put('data', store)
      if (this.env.STORE && storeHasUserData(store)) {
        try {
          await this.env.STORE.put(KV_KEY, JSON.stringify(store))
        } catch (error) {
          console.error('[worker] 同步备份失败', error)
        }
      }
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
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }
    return new Response('Not found', { status: 404 })
  },
}
