import type { AppStore } from '../shared/types.ts'
import { ApiError } from './logic.ts'
import { emptyStore, normalizeStore, type StoreRunner } from './store-state.ts'

interface KVNamespace {
  get(key: string, options?: { type: 'json' } | 'text' | 'json'): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

const KEY = 'app-store'

function asStore(value: unknown): AppStore {
  if (typeof value === 'string') {
    try {
      return normalizeStore(JSON.parse(value) as Partial<AppStore>)
    } catch {
      return emptyStore()
    }
  }
  return normalizeStore(value as Partial<AppStore> | undefined)
}

async function readStore(kv: KVNamespace): Promise<AppStore> {
  try {
    const stored = await kv.get(KEY, { type: 'json' })
    return asStore(stored)
  } catch {
    try {
      const stored = await kv.get(KEY)
      return asStore(stored)
    } catch {
      return emptyStore()
    }
  }
}

export function createKvRunner(kv: KVNamespace): StoreRunner {
  let queue: Promise<unknown> = Promise.resolve()
  return <T>(fn: (store: AppStore) => T | Promise<T>) => {
    const run = queue.then(async () => {
      const store = await readStore(kv)
      const result = await fn(store)
      const payload = JSON.stringify({
        authToken: store.authToken,
        days: store.days,
        plans: store.plans,
        longTerm: store.longTerm,
        activeTimer: store.activeTimer,
        pomodoro: store.pomodoro,
      })
      try {
        await kv.put(KEY, payload)
      } catch (error) {
        console.error('[store-kv] 写入失败', error)
        throw new ApiError(500, '云存储暂时不可用，请稍后重试')
      }
      return result
    })
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }
}

export function createMemoryRunner(): StoreRunner {
  let store = emptyStore()
  return async (fn) => fn(store)
}
