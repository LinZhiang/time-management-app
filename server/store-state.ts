import {
  DEFAULT_POMODORO_SETTINGS,
  type AppStore,
  type LongTermPeriod,
  type LongTermPlan,
  type PomodoroPhase,
} from '../shared/types.ts'

const POMODORO_PHASES: PomodoroPhase[] = ['idle', 'studying', 'studyDone', 'resting']

function normalizePhase(phase: unknown): PomodoroPhase {
  return POMODORO_PHASES.includes(phase as PomodoroPhase) ? (phase as PomodoroPhase) : 'idle'
}

export function emptyLongTerm(): LongTermPlan {
  return {
    overview: { title: '', detail: '', updatedAt: 0 },
    periods: [],
  }
}

function normalizePeriod(raw: Partial<LongTermPeriod> | null | undefined): LongTermPeriod | null {
  if (!raw?.id || !raw.startDate || !raw.endDate || !raw.title) return null
  return {
    id: raw.id,
    title: raw.title,
    detail: raw.detail ?? '',
    startDate: raw.startDate,
    endDate: raw.endDate,
    createdAt: raw.createdAt ?? 0,
  }
}

export function emptyStore(): AppStore {
  return {
    authToken: null,
    days: {},
    plans: [],
    longTerm: emptyLongTerm(),
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
    longTerm: {
      overview: {
        title: raw.longTerm?.overview?.title ?? '',
        detail: raw.longTerm?.overview?.detail ?? '',
        updatedAt: raw.longTerm?.overview?.updatedAt ?? 0,
      },
      periods: (raw.longTerm?.periods ?? []).map(normalizePeriod).filter((item): item is LongTermPeriod => Boolean(item)),
    },
  }
}

export type StoreRunner = <T>(fn: (store: AppStore) => T | Promise<T>) => Promise<T>
