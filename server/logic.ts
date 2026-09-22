import { dateKey, nextDayKey, startOfDay } from '../shared/date.ts'
import { addCategoryTime, cloneDay, emptyDay, ensureDay } from '../shared/record.ts'
import {
  EXERCISE_MIN_MS,
  POMODORO_BUFFER_MS,
  REST_MINUTES_MAX,
  REST_MINUTES_MIN,
  STUDY_MINUTES_MAX,
  STUDY_MINUTES_MIN,
  type ActiveTimer,
  type AppStore,
  type DayRecord,
  type Plan,
  type PomodoroSettings,
  type TimeCategory,
  type TimerCategory,
} from '../shared/types.ts'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function todayRecord(store: AppStore, now: number): DayRecord {
  const today = dateKey(now)
  return cloneDay(store.days[today] ?? emptyDay(today))
}

function elapsedSince(startedAt: number, now: number) {
  return Math.max(0, now - startedAt)
}

function stopActiveTimer(store: AppStore, now: number, options?: { discardExercise?: boolean }) {
  const timer = store.activeTimer
  if (!timer) return
  const elapsed = elapsedSince(timer.startedAt, now)
  const day = dateKey(timer.startedAt)

  if (timer.category === 'exercise') {
    if (!options?.discardExercise && elapsed >= EXERCISE_MIN_MS) {
      const record = ensureDay(store, day)
      addCategoryTime(record, 'exercise', elapsed)
    }
    store.activeTimer = null
    return
  }

  if (elapsed > 0) {
    const record = ensureDay(store, day)
    addCategoryTime(record, timer.category, elapsed, timer.otherNote)
  } else {
    ensureDay(store, dateKey(now)).hasActivity = true
  }
  store.activeTimer = null
}

function rollover(store: AppStore, now: number) {
  const timer = store.activeTimer
  if (!timer || timer.category === 'exercise') return

  while (dateKey(timer.startedAt) < dateKey(now)) {
    const day = dateKey(timer.startedAt)
    const dayEnd = startOfDay(nextDayKey(day))
    const elapsed = dayEnd - timer.startedAt
    if (elapsed > 0) {
      addCategoryTime(ensureDay(store, day), timer.category, elapsed, timer.otherNote)
    }
    timer.startedAt = dayEnd
  }
}

function idlePomodoro(store: AppStore) {
  store.pomodoro.phase = 'idle'
  store.pomodoro.startedAt = null
}

function studyDurationMs(store: AppStore) {
  return store.pomodoro.settings.studyMinutes * 60 * 1000
}

function applyEnterBuffer(store: AppStore, now: number) {
  if (store.pomodoro.phase !== 'studying' || !store.pomodoro.startedAt) return
  store.pomodoro.phase = 'studyDone'
  store.pomodoro.startedAt = Math.min(now, store.pomodoro.startedAt + studyDurationMs(store))
}

function applyEnterRest(store: AppStore, now: number) {
  if (store.pomodoro.phase !== 'studying' && store.pomodoro.phase !== 'studyDone') return
  if (store.activeTimer?.category === 'study') {
    stopActiveTimer(store, now)
  }
  const day = ensureDay(store, dateKey(now))
  day.hasActivity = true
  day.pomodoroRounds.push({
    studyMinutes: store.pomodoro.settings.studyMinutes,
    restMinutes: store.pomodoro.settings.restMinutes,
    completedAt: now,
  })
  day.pomodoroCount += 1
  store.pomodoro.phase = 'resting'
  store.pomodoro.startedAt = now
}

function syncPomodoro(store: AppStore, now: number) {
  const pomodoro = store.pomodoro
  if (pomodoro.phase === 'studying' && pomodoro.startedAt && now - pomodoro.startedAt >= studyDurationMs(store)) {
    applyEnterBuffer(store, now)
  }
  if (pomodoro.phase === 'studyDone' && pomodoro.startedAt && now - pomodoro.startedAt >= POMODORO_BUFFER_MS) {
    applyEnterRest(store, pomodoro.startedAt + POMODORO_BUFFER_MS)
  }
}

function requireNote(category: TimerCategory, otherNote?: string) {
  if (category !== 'other') return
  if (!otherNote?.trim()) {
    throw new ApiError(400, '请填写其他时间的具体内容')
  }
}

export function syncStore(store: AppStore, now = Date.now()) {
  rollover(store, now)
  syncPomodoro(store, now)
  return store
}

export function startTimer(
  store: AppStore,
  category: TimeCategory,
  otherNote: string | undefined,
  now = Date.now(),
) {
  if (store.activeTimer?.category === 'exercise') {
    throw new ApiError(400, '请先在运动管理中停止运动')
  }
  syncStore(store, now)
  requireNote(category, otherNote)
  if (store.pomodoro.phase !== 'idle' && category !== 'study') {
    idlePomodoro(store)
  }
  if (store.activeTimer) {
    stopActiveTimer(store, now, { discardExercise: true })
  }
  ensureDay(store, dateKey(now)).hasActivity = true
  store.activeTimer = {
    category,
    startedAt: now,
    otherNote: category === 'other' ? otherNote?.trim() : undefined,
  }
}

export function stopTimer(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  if (!store.activeTimer) return
  if (store.activeTimer.category === 'exercise') {
    stopActiveTimer(store, now, { discardExercise: true })
    idlePomodoro(store)
    return
  }
  if (store.pomodoro.phase === 'studying' || store.pomodoro.phase === 'studyDone') idlePomodoro(store)
  stopActiveTimer(store, now)
}

export function startPomodoro(store: AppStore, now = Date.now()) {
  if (store.activeTimer?.category === 'exercise') {
    throw new ApiError(400, '请先在运动管理中停止运动')
  }
  syncStore(store, now)
  idlePomodoro(store)
  if (store.activeTimer?.category !== 'study') {
    if (store.activeTimer) stopActiveTimer(store, now, { discardExercise: true })
    ensureDay(store, dateKey(now)).hasActivity = true
    store.activeTimer = { category: 'study', startedAt: now }
  }
  store.pomodoro.phase = 'studying'
  store.pomodoro.startedAt = now
}

export function enterPomodoroBuffer(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  if (store.pomodoro.phase === 'studyDone' || store.pomodoro.phase === 'resting') return
  if (store.pomodoro.phase !== 'studying' || !store.pomodoro.startedAt) {
    throw new ApiError(400, '当前不在番茄学习中')
  }
  applyEnterBuffer(store, now)
}

export function enterPomodoroRest(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  if (store.pomodoro.phase === 'resting') return
  if (store.pomodoro.phase !== 'studying' && store.pomodoro.phase !== 'studyDone') {
    throw new ApiError(400, '当前不在番茄学习中')
  }
  applyEnterRest(store, now)
}

export function exitPomodoro(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  if (
    (store.pomodoro.phase === 'studying' || store.pomodoro.phase === 'studyDone') &&
    store.activeTimer?.category === 'study'
  ) {
    stopActiveTimer(store, now)
  }
  idlePomodoro(store)
}

export function updatePomodoroSettings(store: AppStore, settings: PomodoroSettings) {
  const studyMinutes = Math.round(settings.studyMinutes)
  const restMinutes = Math.round(settings.restMinutes)
  if (studyMinutes < STUDY_MINUTES_MIN || studyMinutes > STUDY_MINUTES_MAX) {
    throw new ApiError(400, `学习时间需在 ${STUDY_MINUTES_MIN}～${STUDY_MINUTES_MAX} 分钟`)
  }
  if (restMinutes < REST_MINUTES_MIN || restMinutes > REST_MINUTES_MAX) {
    throw new ApiError(400, `休息时间需在 ${REST_MINUTES_MIN}～${REST_MINUTES_MAX} 分钟`)
  }
  if (store.pomodoro.phase !== 'idle') {
    throw new ApiError(400, '请先退出番茄后再调整时长')
  }
  store.pomodoro.settings = { studyMinutes, restMinutes }
}

export function startExercise(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  idlePomodoro(store)
  if (store.activeTimer) stopActiveTimer(store, now, { discardExercise: true })
  store.activeTimer = { category: 'exercise', startedAt: now }
}

export function stopExercise(store: AppStore, calories: number | undefined, now = Date.now()) {
  syncStore(store, now)
  const timer = store.activeTimer
  if (timer?.category !== 'exercise') {
    throw new ApiError(400, '当前没有进行中的运动')
  }
  const elapsed = elapsedSince(timer.startedAt, now)
  if (elapsed < EXERCISE_MIN_MS) {
    store.activeTimer = null
    return { recorded: false, elapsedMs: elapsed, calories: 0 }
  }
  if (calories == null || !Number.isFinite(calories) || calories <= 0) {
    throw new ApiError(400, '请填写大于 0 的锻炼大卡量')
  }
  const day = ensureDay(store, dateKey(timer.startedAt))
  addCategoryTime(day, 'exercise', elapsed)
  day.exerciseCalories += calories
  store.activeTimer = null
  return { recorded: true, elapsedMs: elapsed, calories }
}

export function createPlan(store: AppStore, title: string, detail: string, now = Date.now()) {
  const trimmedTitle = title.trim()
  const trimmedDetail = detail.trim()
  if (!trimmedTitle) throw new ApiError(400, '请填写计划标题')
  const plan: Plan = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    date: dateKey(now),
    title: trimmedTitle,
    detail: trimmedDetail,
    createdAt: now,
  }
  store.plans.unshift(plan)
  return plan
}

export function listPlans(store: AppStore, from: string, to: string) {
  return store.plans
    .filter((plan) => plan.date >= from && plan.date <= to)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
}

export function getPlan(store: AppStore, id: string) {
  const plan = store.plans.find((item) => item.id === id)
  if (!plan) throw new ApiError(404, '计划不存在')
  return plan
}

function withLiveTimer(day: DayRecord, timer: ActiveTimer | null, now: number): DayRecord {
  const live = cloneDay(day)
  if (!timer || timer.category === 'exercise') return live
  const start = Math.max(timer.startedAt, startOfDay(day.date))
  const end = Math.min(now, startOfDay(nextDayKey(day.date)))
  if (end > start) addCategoryTime(live, timer.category, end - start, timer.otherNote)
  return live
}

export function getLiveToday(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  return withLiveTimer(todayRecord(store, now), store.activeTimer, now)
}

export function getDaySnapshot(store: AppStore, date: string, now = Date.now()) {
  syncStore(store, now)
  const base = store.days[date] ?? emptyDay(date)
  if (date !== dateKey(now)) return cloneDay(base)
  const live = withLiveTimer(base, store.activeTimer, now)
  if (store.activeTimer?.category === 'exercise') {
    const elapsed = elapsedSince(store.activeTimer.startedAt, now)
    if (elapsed >= EXERCISE_MIN_MS) addCategoryTime(live, 'exercise', elapsed)
  }
  return live
}

export function listLogs(store: AppStore, from: string, to: string, now = Date.now()) {
  syncStore(store, now)
  const dates = new Set(Object.keys(store.days).filter((date) => date >= from && date <= to))
  const today = dateKey(now)
  if (today >= from && today <= to) dates.add(today)

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => getDaySnapshot(store, date, now))
    .filter((day) => day.hasActivity)
}

export function sumRange(store: AppStore, from: string, to: string, now = Date.now()) {
  const days = listLogs(store, from, to, now)
  const total = emptyDay(`${from}~${to}`)
  for (const day of days) {
    total.workMs += day.workMs
    total.commuteMs += day.commuteMs
    total.studyMs += day.studyMs
    total.houseworkMs += day.houseworkMs
    total.socialMs += day.socialMs
    total.otherMs += day.otherMs
    total.exerciseMs += day.exerciseMs
    total.exerciseCalories += day.exerciseCalories
    total.pomodoroCount += day.pomodoroCount
    total.pomodoroRounds.push(...day.pomodoroRounds)
    for (const detail of day.otherDetails) {
      const found = total.otherDetails.find((item) => item.note === detail.note)
      if (found) found.ms += detail.ms
      else total.otherDetails.push({ ...detail, note: `${day.date} ${detail.note}` })
    }
    if (day.hasActivity) total.hasActivity = true
  }
  return { total, days }
}

export function liveState(store: AppStore, now = Date.now()) {
  syncStore(store, now)
  return {
    today: getDaySnapshot(store, dateKey(now), now),
    activeTimer: store.activeTimer,
    pomodoro: store.pomodoro,
    now,
  }
}
