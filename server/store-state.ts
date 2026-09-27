import { cloneDay, emptyDay } from '../shared/record.ts'
import {
  DEFAULT_POMODORO_SETTINGS,
  type AppStore,
  type DayRecord,
  type LongTermPeriod,
  type LongTermPlan,
  type Plan,
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

export function storeHasUserData(store: AppStore): boolean {
  return (
    Object.keys(store.days).length > 0 ||
    store.plans.length > 0 ||
    store.longTerm.periods.length > 0 ||
    Boolean(store.longTerm.overview.title || store.longTerm.overview.detail)
  )
}

function asDay(raw?: DayRecord): DayRecord | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const date = typeof raw.date === 'string' ? raw.date : ''
  const base = emptyDay(date)
  return cloneDay({
    ...base,
    ...raw,
    date: date || base.date,
    workMs: Number(raw.workMs) || 0,
    commuteMs: Number(raw.commuteMs) || 0,
    studyMs: Number(raw.studyMs) || 0,
    houseworkMs: Number(raw.houseworkMs) || 0,
    socialMs: Number(raw.socialMs) || 0,
    otherMs: Number(raw.otherMs) || 0,
    otherDetails: Array.isArray(raw.otherDetails) ? raw.otherDetails : [],
    exerciseMs: Number(raw.exerciseMs) || 0,
    exerciseCalories: Number(raw.exerciseCalories) || 0,
    pomodoroRounds: Array.isArray(raw.pomodoroRounds) ? raw.pomodoroRounds : [],
    pomodoroCount: Number(raw.pomodoroCount) || 0,
    hasActivity: Boolean(raw.hasActivity),
  })
}

function mergeDay(left?: DayRecord, right?: DayRecord): DayRecord | undefined {
  const first = asDay(left)
  const second = asDay(right)
  if (!first) return second
  if (!second) return first
  const otherDetails = [...first.otherDetails]
  for (const item of second.otherDetails) {
    const found = otherDetails.find((row) => row.note === item.note)
    if (found) found.ms = Math.max(found.ms, item.ms)
    else otherDetails.push({ ...item })
  }
  const rounds = [...first.pomodoroRounds]
  for (const item of second.pomodoroRounds) {
    if (!rounds.some((row) => row.completedAt === item.completedAt)) rounds.push(item)
  }
  return {
    date: first.date || second.date,
    workMs: Math.max(first.workMs, second.workMs),
    commuteMs: Math.max(first.commuteMs, second.commuteMs),
    studyMs: Math.max(first.studyMs, second.studyMs),
    houseworkMs: Math.max(first.houseworkMs, second.houseworkMs),
    socialMs: Math.max(first.socialMs, second.socialMs),
    otherMs: Math.max(first.otherMs, second.otherMs),
    otherDetails,
    exerciseMs: Math.max(first.exerciseMs, second.exerciseMs),
    exerciseCalories: Math.max(first.exerciseCalories, second.exerciseCalories),
    pomodoroRounds: rounds.sort((a, b) => a.completedAt - b.completedAt),
    pomodoroCount: Math.max(first.pomodoroCount, second.pomodoroCount, rounds.length),
    hasActivity: first.hasActivity || second.hasActivity,
  }
}

export function mergeStore(
  current: Partial<AppStore> | null | undefined,
  incoming: Partial<AppStore> | null | undefined,
): AppStore {
  const left = normalizeStore(current)
  const right = normalizeStore(incoming)
  const days: Record<string, DayRecord> = {}
  for (const key of new Set([...Object.keys(left.days), ...Object.keys(right.days)])) {
    const merged = mergeDay(left.days[key], right.days[key])
    if (merged) days[key] = merged
  }
  const plans = new Map<string, Plan>()
  for (const plan of [...left.plans, ...right.plans]) plans.set(plan.id, plan)
  const periods = new Map<string, LongTermPeriod>()
  for (const period of [...left.longTerm.periods, ...right.longTerm.periods]) {
    periods.set(period.id, period)
  }
  const leftOverview = left.longTerm.overview
  const rightOverview = right.longTerm.overview
  const overview =
    (rightOverview.title || rightOverview.detail) && rightOverview.updatedAt >= leftOverview.updatedAt
      ? rightOverview
      : leftOverview.title || leftOverview.detail
        ? leftOverview
        : rightOverview
  return {
    authToken: left.authToken || right.authToken,
    days,
    plans: [...plans.values()].sort((a, b) => b.createdAt - a.createdAt),
    longTerm: {
      overview,
      periods: [...periods.values()].sort((a, b) => b.createdAt - a.createdAt),
    },
    activeTimer: left.activeTimer || right.activeTimer,
    pomodoro: left.pomodoro.startedAt ? left.pomodoro : right.pomodoro.startedAt ? right.pomodoro : left.pomodoro,
  }
}
