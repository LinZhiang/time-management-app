export const TIME_CATEGORIES = [
  'work',
  'commute',
  'study',
  'housework',
  'social',
  'other',
] as const

export type TimeCategory = (typeof TIME_CATEGORIES)[number]
export type TimerCategory = TimeCategory | 'exercise'

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

export interface ActiveTimer {
  category: TimerCategory
  startedAt: number
  otherNote?: string
}

export interface PomodoroSettings {
  studyMinutes: number
  restMinutes: number
}

export interface PomodoroState {
  phase: 'idle' | 'studying' | 'resting'
  startedAt: number | null
  settings: PomodoroSettings
}

export interface AppStore {
  authToken: string | null
  days: Record<string, DayRecord>
  plans: Plan[]
  activeTimer: ActiveTimer | null
  pomodoro: PomodoroState
}

export interface LiveState {
  today: DayRecord
  activeTimer: ActiveTimer | null
  pomodoro: PomodoroState
  now: number
}

export const CATEGORY_LABELS: Record<TimerCategory, string> = {
  work: '工作时间',
  commute: '交通出行时间',
  study: '学习时间',
  housework: '做饭家务时间',
  social: '应酬出行时间',
  other: '其他时间',
  exercise: '运动时间',
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  studyMinutes: 25,
  restMinutes: 10,
}

export const STUDY_MINUTES_MIN = 22
export const STUDY_MINUTES_MAX = 52
export const REST_MINUTES_MIN = 7
export const REST_MINUTES_MAX = 15
export const EXERCISE_MIN_MS = 30 * 60 * 1000
