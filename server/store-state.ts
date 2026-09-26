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
  if (!raw || typeof raw !== 'object') return base
  const days = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : {}
  const plans = Array.isArray(raw.plans) ? raw.plans : []
  const periods = Array.isArray(raw.longTerm?.periods) ? raw.longTerm.periods : []
  const settings =
    raw.pomodoro?.settings && typeof raw.pomodoro.settings === 'object' ? raw.pomodoro.settings : {}
  return {
    ...base,
    authToken: typeof raw.authToken === 'string' ? raw.authToken : null,
    days,
    plans,
    longTerm: {
      overview: {
        title: typeof raw.longTerm?.overview?.title === 'string' ? raw.longTerm.overview.title : '',
        detail: typeof raw.longTerm?.overview?.detail === 'string' ? raw.longTerm.overview.detail : '',
        updatedAt: typeof raw.longTerm?.overview?.updatedAt === 'number' ? raw.longTerm.overview.updatedAt : 0,
      },
      periods: periods.map(normalizePeriod).filter((item): item is LongTermPeriod => Boolean(item)),
    },
    activeTimer: raw.activeTimer ?? null,
    pomodoro: {
      phase: normalizePhase(raw.pomodoro?.phase),
      startedAt: raw.pomodoro?.startedAt ?? null,
      settings: {
        ...DEFAULT_POMODORO_SETTINGS,
        ...settings,
      },
    },
  }
}

export type StoreRunner = <T>(fn: (store: AppStore) => T | Promise<T>) => Promise<T>
