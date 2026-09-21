import type { AppStore, DayRecord, TimerCategory } from './types.ts'

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
    otherDetails: day.otherDetails.map((item) => ({ ...item })),
    pomodoroRounds: day.pomodoroRounds.map((item) => ({ ...item })),
  }
}

export function ensureDay(store: AppStore, date: string): DayRecord {
  const existing = store.days[date]
  if (existing) return existing
  const created = emptyDay(date)
  store.days[date] = created
  return created
}

export function addCategoryTime(
  day: DayRecord,
  category: TimerCategory,
  ms: number,
  otherNote?: string,
) {
  if (ms <= 0) return
  day.hasActivity = true
  if (category === 'work') day.workMs += ms
  else if (category === 'commute') day.commuteMs += ms
  else if (category === 'study') day.studyMs += ms
  else if (category === 'housework') day.houseworkMs += ms
  else if (category === 'social') day.socialMs += ms
  else if (category === 'exercise') day.exerciseMs += ms
  else {
    day.otherMs += ms
    const note = (otherNote ?? '').trim()
    if (note) {
      const found = day.otherDetails.find((item) => item.note === note)
      if (found) found.ms += ms
      else day.otherDetails.push({ note, ms })
    }
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
    day.exerciseMs
  )
}
