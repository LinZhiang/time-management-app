export const TIME_CATEGORIES = [
  'work',
  'commute',
  'study',
  'housework',
  'social',
  'other',
] as const

export type TimeCategory = (typeof TIME_CATEGORIES)[number]
export type EntertainmentCategory = 'video' | 'game'
export type TimerCategory = TimeCategory | 'exercise' | EntertainmentCategory
export type TrackedCategory = TimerCategory | string

export const UNDELETABLE_TIME_CATEGORIES = ['work', 'study', 'other'] as const
export const DELETABLE_BUILTIN_CATEGORIES = ['commute', 'housework', 'social'] as const
export type HiddenTimeCategory = (typeof DELETABLE_BUILTIN_CATEGORIES)[number]

export interface CustomTimeModule {
  id: string
  title: string
  createdAt: number
}

export interface VisibleTimeModule {
  id: string
  title: string
  deletable: boolean
}

export interface OtherDetail {
  note: string
  ms: number
}

export interface PomodoroRound {
  studyMinutes: number
  restMinutes: number
  completedAt: number
}

export interface DayRecord {
  date: string
  workMs: number
  commuteMs: number
  studyMs: number
  houseworkMs: number
  socialMs: number
  otherMs: number
  otherDetails: OtherDetail[]
  customMs: Record<string, number>
  videoMs: number
  gameMs: number
  videoBoughtMs: number
  gameBoughtMs: number
  exerciseMs: number
  exerciseCalories: number
  pomodoroRounds: PomodoroRound[]
  pomodoroCount: number
  hasActivity: boolean
}

export interface Plan {
  id: string
  date: string
  title: string
  detail: string
  createdAt: number
}

export interface LongTermOverview {
  title: string
  detail: string
  updatedAt: number
}

export interface LongTermPeriod {
  id: string
  title: string
  detail: string
  startDate: string
  endDate: string
  createdAt: number
}

export interface LongTermPlan {
  overview: LongTermOverview
  periods: LongTermPeriod[]
}

export interface ActiveTimer {
  category: TrackedCategory
  startedAt: number
  otherNote?: string
}

export interface PomodoroSettings {
  studyMinutes: number
  restMinutes: number
}

export type PomodoroPhase = 'idle' | 'studying' | 'studyDone' | 'resting'

export interface PomodoroState {
  phase: PomodoroPhase
  startedAt: number | null
  settings: PomodoroSettings
}

export interface EntertainmentBonusFlags {
  daily?: boolean
  work?: boolean
  study?: boolean
  commute?: boolean
  social?: boolean
  housework?: boolean
}

export interface EntertainmentSpend {
  id: string
  date: string
  amount: number
  createdAt: number
  kind?: 'consume' | 'extend'
  category?: EntertainmentCategory
  extraMs?: number
  note?: string
}

export interface EntertainmentWallet {
  balance: number
  bonus: Record<string, EntertainmentBonusFlags>
  spends: EntertainmentSpend[]
}

export interface EntertainmentLive {
  balance: number
  videoMs: number
  gameMs: number
  videoBoughtMs: number
  gameBoughtMs: number
  videoLimitMs: number
  gameLimitMs: number
  videoRemainingMs: number
  gameRemainingMs: number
  grantsToday: EntertainmentBonusFlags
  spendsToday: EntertainmentSpend[]
}

export interface AppStore {
  authToken: string | null
  days: Record<string, DayRecord>
  plans: Plan[]
  longTerm: LongTermPlan
  activeTimer: ActiveTimer | null
  pomodoro: PomodoroState
  customModules: CustomTimeModule[]
  hiddenCategories: HiddenTimeCategory[]
  entertainment: EntertainmentWallet
}

export interface LiveState {
  today: DayRecord
  activeTimer: ActiveTimer | null
  pomodoro: PomodoroState
  now: number
  customModules: CustomTimeModule[]
  hiddenCategories: HiddenTimeCategory[]
  entertainment: EntertainmentLive
}

export const CATEGORY_LABELS: Record<TimerCategory, string> = {
  work: '工作时间',
  commute: '交通出行时间',
  study: '学习时间',
  housework: '做饭家务时间',
  social: '应酬出行时间',
  other: '其他时间',
  exercise: '运动时间',
  video: '视频时间',
  game: '游戏时间',
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  studyMinutes: 25,
  restMinutes: 10,
}

/** 番茄学习结束后的缓冲，仍计入学习时间 */
export const POMODORO_BUFFER_MS = 10 * 60 * 1000

export const STUDY_MINUTES_MIN = 22
export const STUDY_MINUTES_MAX = 52
export const REST_MINUTES_MIN = 7
export const REST_MINUTES_MAX = 15
export const EXERCISE_MIN_MS = 30 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000
export const VIDEO_LIMIT_MS = HOUR_MS
export const GAME_LIMIT_MS = 30 * 60 * 1000
export const VIDEO_MS_PER_YUAN = 3 * 60 * 1000
export const GAME_MS_PER_YUAN = 1.5 * 60 * 1000
export const ENTERTAINMENT_WARN_MS = 3 * 60 * 1000
export const ENTERTAINMENT_DAILY_YUAN = 5
export const ENTERTAINMENT_BONUS = {
  work: 1,
  study: 2.5,
  commute: 1,
  social: 1,
  housework: 2,
} as const
