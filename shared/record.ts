import { isEntertainmentCategory, isTimeCategory } from './time-modules.ts'
import {
  GAME_LIMIT_MS,
  GAME_MS_PER_YUAN,
  VIDEO_LIMIT_MS,
  VIDEO_MS_PER_YUAN,
  type AppStore,
  type DayRecord,
  type EntertainmentCategory,
  type TrackedCategory,
} from './types.ts'

export function emptyDay(date: string): DayRecord {
  return {
    date,
    workMs: 0,
    commuteMs: 0,
    studyMs: 0,
    houseworkMs: 0,
    socialMs: 0,
    otherMs: 0,
    otherDetails: [],
    customMs: {},
    videoMs: 0,
    gameMs: 0,
    videoBoughtMs: 0,
    gameBoughtMs: 0,
    exerciseMs: 0,
    exerciseCalories: 0,
    pomodoroRounds: [],
    pomodoroCount: 0,
    hasActivity: false,
  }
}

export function cloneDay(day: DayRecord): DayRecord {
  return {
    ...day,
    otherDetails: (day.otherDetails ?? []).map((item) => ({ ...item })),
    customMs: { ...(day.customMs ?? {}) },
    videoMs: Number(day.videoMs) || 0,
    gameMs: Number(day.gameMs) || 0,
    videoBoughtMs: Number(day.videoBoughtMs) || 0,
    gameBoughtMs: Number(day.gameBoughtMs) || 0,
    pomodoroRounds: (day.pomodoroRounds ?? []).map((item) => ({ ...item })),
  }
}

export function ensureDay(store: AppStore, date: string): DayRecord {
  const existing = store.days[date]
  if (existing) {
    if (!existing.customMs) existing.customMs = {}
    if (!existing.otherDetails) existing.otherDetails = []
    return existing
  }
  const created = emptyDay(date)
  store.days[date] = created
  return created
}

export function addOtherDetail(day: DayRecord, note: string, ms: number) {
  if (ms <= 0) return
  day.hasActivity = true
  day.otherMs += ms
  const label = note.trim()
  if (!label) return
  const found = day.otherDetails.find((item) => item.note === label)
  if (found) found.ms += ms
  else day.otherDetails.push({ note: label, ms })
}

export function entertainmentBoughtMs(day: DayRecord, category: EntertainmentCategory) {
  return category === 'video' ? day.videoBoughtMs || 0 : day.gameBoughtMs || 0
}

export function entertainmentLimitMs(day: DayRecord, category: EntertainmentCategory) {
  const base = category === 'video' ? VIDEO_LIMIT_MS : GAME_LIMIT_MS
  return base + entertainmentBoughtMs(day, category)
}

export function entertainmentUsedMs(day: DayRecord, category: EntertainmentCategory) {
  return category === 'video' ? day.videoMs || 0 : day.gameMs || 0
}

export function entertainmentRemainingMs(day: DayRecord, category: EntertainmentCategory) {
  return Math.max(0, entertainmentLimitMs(day, category) - entertainmentUsedMs(day, category))
}

export function extraMsForYuan(category: EntertainmentCategory, yuan: number) {
  const perYuan = category === 'video' ? VIDEO_MS_PER_YUAN : GAME_MS_PER_YUAN
  return Math.round(yuan * perYuan)
}

export function addCategoryTime(
  day: DayRecord,
  category: TrackedCategory,
  ms: number,
  otherNote?: string,
) {
  if (ms <= 0) return
  day.hasActivity = true
  if (!day.customMs) day.customMs = {}
  if (!day.otherDetails) day.otherDetails = []
  if (category === 'work') day.workMs += ms
  else if (category === 'commute') day.commuteMs += ms
  else if (category === 'study') day.studyMs += ms
  else if (category === 'housework') day.houseworkMs += ms
  else if (category === 'social') day.socialMs += ms
  else if (category === 'exercise') day.exerciseMs += ms
  else if (isEntertainmentCategory(category)) {
    const add = Math.min(ms, entertainmentRemainingMs(day, category))
    if (add <= 0) return
    if (category === 'video') day.videoMs += add
    else day.gameMs += add
  }
  else if (category === 'other') addOtherDetail(day, otherNote ?? '', ms)
  else if (!isTimeCategory(category)) {
    day.customMs[category] = (day.customMs[category] || 0) + ms
  }
}

export function sumDayMs(day: DayRecord): number {
  return (
    day.workMs +
    day.commuteMs +
    day.studyMs +
    day.houseworkMs +
    day.socialMs +
    day.otherMs +
    Object.values(day.customMs ?? {}).reduce((sum, value) => sum + value, 0) +
    (day.videoMs || 0) +
    (day.gameMs || 0) +
    day.exerciseMs
  )
}
