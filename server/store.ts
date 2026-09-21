import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppStore } from '../shared/types.ts'
import { emptyStore, normalizeStore } from './store-state.ts'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(rootDir, 'server', 'data')
const storePath = path.join(dataDir, 'cloud-store.json')

let cache: AppStore | null = null
let queue: Promise<unknown> = Promise.resolve()

async function readStore(): Promise<AppStore> {
  if (cache) return cache
  try {
    const raw = await readFile(storePath, 'utf8')
    cache = normalizeStore(JSON.parse(raw) as Partial<AppStore>)
    return cache
  } catch {
    cache = emptyStore()
    return cache
  }
}

async function writeStore(store: AppStore) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8')
  cache = store
}

export function withStore<T>(fn: (store: AppStore) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const store = await readStore()
    const result = await fn(store)
    await writeStore(store)
    return result
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
