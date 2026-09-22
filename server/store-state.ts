import { DEFAULT_POMODORO_SETTINGS, type AppStore, type PomodoroPhase } from '../shared/types.ts'

const POMODORO_PHASES: PomodoroPhase[] = ['idle', 'studying', 'studyDone', 'resting']

function normalizePhase(phase: unknown): PomodoroPhase {
  return POMODORO_PHASES.includes(phase as PomodoroPhase) ? (phase as PomodoroPhase) : 'idle'
}

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
      phase: normalizePhase(raw.pomodoro?.phase),
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
