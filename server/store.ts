import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POMODORO_SETTINGS, type AppStore } from '../shared/types.ts'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(rootDir, 'server', 'data')
const storePath = path.join(dataDir, 'cloud-store.json')

function emptyStore(): AppStore {
  return {
    authToken: null,
    days: {},
    plans: [],
    activeTimer: null,
    pomodoro: {
      phase: 'idle',
      startedAt: null,
      settings: { ...DEFAULT_POMODORO_SETTINGS },
    },
  }
}

let cache: AppStore | null = null
let queue: Promise<unknown> = Promise.resolve()

async function readStore(): Promise<AppStore> {
  if (cache) return cache
  try {
    const raw = await readFile(storePath, 'utf8')
    cache = { ...emptyStore(), ...JSON.parse(raw) } as AppStore
    cache.pomodoro = {
      phase: cache.pomodoro?.phase ?? 'idle',
      startedAt: cache.pomodoro?.startedAt ?? null,
      settings: {
        ...DEFAULT_POMODORO_SETTINGS,
        ...cache.pomodoro?.settings,
      },
    }
    cache.days ??= {}
    cache.plans ??= []
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

export function getStorePath() {
  return storePath
}
