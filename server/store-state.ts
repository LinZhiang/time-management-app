import { DEFAULT_POMODORO_SETTINGS, type AppStore } from '../shared/types.ts'

export function emptyStore(): AppStore {
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

export function normalizeStore(raw: Partial<AppStore> | null | undefined): AppStore {
  const base = emptyStore()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    pomodoro: {
      phase: raw.pomodoro?.phase ?? 'idle',
      startedAt: raw.pomodoro?.startedAt ?? null,
      settings: {
        ...DEFAULT_POMODORO_SETTINGS,
        ...raw.pomodoro?.settings,
      },
    },
    days: raw.days ?? {},
    plans: raw.plans ?? [],
  }
}

export type StoreRunner = <T>(fn: (store: AppStore) => T | Promise<T>) => Promise<T>
