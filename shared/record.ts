import { isTimeCategory } from './time-modules.ts'
import type { AppStore, DayRecord, TrackedCategory } from './types.ts'

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
    day.exerciseMs
  )
}
