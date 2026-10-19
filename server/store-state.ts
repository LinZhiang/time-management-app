import { cloneDay, emptyDay } from '../shared/record.ts'
import { isHiddenTimeCategory } from '../shared/time-modules.ts'
import {
  DEFAULT_POMODORO_SETTINGS,
  ENTERTAINMENT_BONUS,
  ENTERTAINMENT_DAILY_YUAN,
  type AppStore,
  type CustomTimeModule,
  type DayRecord,
  type HiddenTimeCategory,
  type LongTermPeriod,
  type LongTermPlan,
  type EntertainmentBonusFlags,
  type EntertainmentSpend,
  type EntertainmentWallet,
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

function normalizeCustomMs(raw: DayRecord['customMs'] | undefined): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const customMs: Record<string, number> = {}
  for (const [id, ms] of Object.entries(raw)) {
    const value = Number(ms)
    if (id && value > 0) customMs[id] = value
  }
  return customMs
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
    customMs: normalizeCustomMs(raw.customMs),
    videoMs: Number(raw.videoMs) || 0,
    gameMs: Number(raw.gameMs) || 0,
    exerciseMs: Number(raw.exerciseMs) || 0,
    exerciseCalories: Number(raw.exerciseCalories) || 0,
    pomodoroRounds: Array.isArray(raw.pomodoroRounds) ? raw.pomodoroRounds : [],
    pomodoroCount: Number(raw.pomodoroCount) || 0,
    hasActivity: Boolean(raw.hasActivity),
  })
}

function normalizeCustomModules(raw: AppStore['customModules'] | undefined): CustomTimeModule[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const modules: CustomTimeModule[] = []
  for (const item of raw) {
    if (!item?.id || !item.title || seen.has(item.id)) continue
    seen.add(item.id)
    modules.push({
      id: item.id,
      title: String(item.title).trim(),
      createdAt: Number(item.createdAt) || 0,
    })
  }
  return modules.sort((a, b) => a.createdAt - b.createdAt)
}

function normalizeHiddenCategories(raw: AppStore['hiddenCategories'] | undefined): HiddenTimeCategory[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(isHiddenTimeCategory))]
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
    customModules: [],
    hiddenCategories: [],
    entertainment: emptyEntertainment(),
  }
}

export function emptyEntertainment(): EntertainmentWallet {
  return {
    balance: 0,
    bonus: {},
    spends: [],
  }
}

function normalizeEntertainment(raw: AppStore['entertainment'] | undefined): EntertainmentWallet {
  const base = emptyEntertainment()
  if (!raw || typeof raw !== 'object') return base
  const bonus: Record<string, EntertainmentBonusFlags> = {}
  if (raw.bonus && typeof raw.bonus === 'object') {
    for (const [date, flags] of Object.entries(raw.bonus)) {
      if (!flags || typeof flags !== 'object') continue
      bonus[date] = {
        daily: Boolean(flags.daily),
        work: Boolean(flags.work),
        study: Boolean(flags.study),
        commute: Boolean(flags.commute),
        social: Boolean(flags.social),
        housework: Boolean(flags.housework),
      }
    }
  }
  const spends: EntertainmentSpend[] = Array.isArray(raw.spends)
    ? raw.spends
        .filter((item) => item?.id && Number(item.amount) > 0)
        .map((item) => ({
          id: item.id,
          date: item.date || '',
          amount: Number(item.amount) || 0,
          createdAt: Number(item.createdAt) || 0,
        }))
    : []
  return {
    balance: Math.max(0, Math.round((Number(raw.balance) || 0) * 100) / 100),
    bonus,
    spends,
  }
}

export function normalizeStore(raw: Partial<AppStore> | null | undefined): AppStore {
  const base = emptyStore()
  if (!raw || typeof raw !== 'object') return base
  const rawDays = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : {}
  const days: Record<string, DayRecord> = {}
  for (const [key, value] of Object.entries(rawDays)) {
    const day = asDay(value as DayRecord)
    if (day) days[key] = day
  }
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
    customModules: normalizeCustomModules(raw.customModules),
    hiddenCategories: normalizeHiddenCategories(raw.hiddenCategories),
    entertainment: normalizeEntertainment(raw.entertainment),
  }
}

export type StoreRunner = <T>(fn: (store: AppStore) => T | Promise<T>) => Promise<T>

export function storeHasUserData(store: AppStore): boolean {
  return (
    Object.keys(store.days).length > 0 ||
    store.plans.length > 0 ||
    store.customModules.length > 0 ||
    store.entertainment.balance > 0 ||
    store.longTerm.periods.length > 0 ||
    Boolean(store.longTerm.overview.title || store.longTerm.overview.detail)
  )
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
  const customMs: Record<string, number> = { ...first.customMs }
  for (const [id, ms] of Object.entries(second.customMs)) {
    customMs[id] = Math.max(customMs[id] || 0, ms)
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
    customMs,
    videoMs: Math.max(first.videoMs, second.videoMs),
    gameMs: Math.max(first.gameMs, second.gameMs),
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
    customModules: normalizeCustomModules([...left.customModules, ...right.customModules]),
    hiddenCategories: normalizeHiddenCategories([...left.hiddenCategories, ...right.hiddenCategories]),
    entertainment: mergeEntertainment(left.entertainment, right.entertainment),
  }
}

function entertainmentGrantedYuan(bonus: Record<string, EntertainmentBonusFlags>) {
  let sum = 0
  for (const flags of Object.values(bonus)) {
    if (flags.daily) sum += ENTERTAINMENT_DAILY_YUAN
    if (flags.work) sum += ENTERTAINMENT_BONUS.work
    if (flags.study) sum += ENTERTAINMENT_BONUS.study
    if (flags.commute) sum += ENTERTAINMENT_BONUS.commute
    if (flags.social) sum += ENTERTAINMENT_BONUS.social
    if (flags.housework) sum += ENTERTAINMENT_BONUS.housework
  }
  return sum
}

function mergeEntertainment(left: EntertainmentWallet, right: EntertainmentWallet): EntertainmentWallet {
  const bonus: Record<string, EntertainmentBonusFlags> = { ...left.bonus }
  for (const [date, flags] of Object.entries(right.bonus)) {
    bonus[date] = { ...bonus[date], ...flags }
  }
  const spends = new Map<string, EntertainmentSpend>()
  for (const item of [...left.spends, ...right.spends]) spends.set(item.id, item)
  const spendList = [...spends.values()].sort((a, b) => b.createdAt - a.createdAt)
  const spent = spendList.reduce((sum, item) => sum + item.amount, 0)
  return {
    balance: Math.max(0, Math.round((entertainmentGrantedYuan(bonus) - spent) * 100) / 100),
    bonus,
    spends: spendList,
  }
}
