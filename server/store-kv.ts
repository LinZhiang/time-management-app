import type { AppStore } from '../shared/types.ts'
import { emptyStore, normalizeStore, type StoreRunner } from './store-state.ts'

interface KVNamespace {
  get(key: string, options: { type: 'json' }): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

const KEY = 'app-store'

export function createKvRunner(kv: KVNamespace): StoreRunner {
  let queue: Promise<unknown> = Promise.resolve()
  return <T>(fn: (store: AppStore) => T | Promise<T>) => {
    const run = queue.then(async () => {
      const stored = await kv.get(KEY, { type: 'json' })
      const store = normalizeStore((stored ?? undefined) as Partial<AppStore> | undefined)
      const result = await fn(store)
      await kv.put(KEY, JSON.stringify(store))
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
