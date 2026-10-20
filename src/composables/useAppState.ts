import { computed, ref, shallowRef } from 'vue'
import {
  enterPomodoroBuffer,
  enterPomodoroRest,
  exitPomodoro,
  fetchState,
  savePomodoroSettings,
  startExercise,
  startPomodoro,
  startTimer,
  stopExercise,
  stopTimer,
  createTimeModule,
  deleteTimeModule,
  extendEntertainment,
  spendEntertainment,
} from '../api/client'
import { dateKey } from '../../shared/date.ts'
import { isEntertainmentCategory } from '../../shared/time-modules.ts'
import {
  ENTERTAINMENT_WARN_MS,
  GAME_LIMIT_MS,
  VIDEO_LIMIT_MS,
  type EntertainmentCategory,
  type LiveState,
  type PomodoroPhase,
  type PomodoroSettings,
} from '../../shared/types.ts'
import {
  playEntertainmentEndSound,
  playEntertainmentWarnSound,
  playExerciseStartSound,
  playRestStartSound,
  playStartSound,
  playStudyStartSound,
  unlockAudio,
} from '../utils/audio'

const state = shallowRef<LiveState | null>(null)
const now = ref(Date.now())
const loading = ref(false)
const error = ref('')
let tickTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let started = false
let lastPomodoroPhase: PomodoroPhase | null = null
let entertainmentSession: string | null = null
let entertainmentWarnPlayed = false
let entertainmentEndPlayed = false
let entertainmentStopping = false

function playPomodoroPhaseSound(previous: PomodoroPhase | null, next: PomodoroPhase) {
  if (!previous || previous === next) return
  if (next === 'studying') playStudyStartSound()
  else if (next === 'studyDone') playStartSound()
  else if (next === 'resting') playRestStartSound()
}

function applyState(next: LiveState) {
  const previousPhase = lastPomodoroPhase
  const previousTimer = state.value?.activeTimer
  state.value = next
  now.value = next.now || Date.now()
  error.value = ''
  lastPomodoroPhase = next.pomodoro.phase
  playPomodoroPhaseSound(previousPhase, next.pomodoro.phase)
  if (
    previousTimer &&
    isEntertainmentCategory(previousTimer.category) &&
    next.activeTimer?.category !== previousTimer.category &&
    !entertainmentEndPlayed
  ) {
    const remaining =
      previousTimer.category === 'video' ? next.entertainment.videoRemainingMs : next.entertainment.gameRemainingMs
    if (remaining <= 0) {
      entertainmentEndPlayed = true
      playEntertainmentEndSound()
    }
  }
  tickEntertainmentAlarms()
}

function extraElapsedMs() {
  const syncedAt = state.value?.now ?? now.value
  return Math.max(0, now.value - syncedAt)
}

function liveEntertainmentRemaining(category: EntertainmentCategory) {
  const live = state.value?.entertainment
  if (!live) return category === 'video' ? VIDEO_LIMIT_MS : GAME_LIMIT_MS
  const remaining = category === 'video' ? live.videoRemainingMs : live.gameRemainingMs
  const running = state.value?.activeTimer?.category === category
  return Math.max(0, running ? remaining - extraElapsedMs() : remaining)
}

function resetEntertainmentAlarms() {
  entertainmentSession = null
  entertainmentWarnPlayed = false
  entertainmentEndPlayed = false
}

function tickEntertainmentAlarms() {
  const timer = state.value?.activeTimer
  if (!timer || !isEntertainmentCategory(timer.category)) {
    resetEntertainmentAlarms()
    return
  }
  const session = `${timer.category}-${timer.startedAt}`
  if (entertainmentSession !== session) {
    entertainmentSession = session
    entertainmentWarnPlayed = false
    entertainmentEndPlayed = false
  }
  const remaining = liveEntertainmentRemaining(timer.category)
  if (remaining > ENTERTAINMENT_WARN_MS) entertainmentWarnPlayed = false
  if (remaining <= 0) {
    if (entertainmentEndPlayed || entertainmentStopping) return
    entertainmentEndPlayed = true
    entertainmentStopping = true
    playEntertainmentEndSound()
    void stopTimer()
      .then((next) => applyState(next))
      .catch(() => {
        entertainmentEndPlayed = false
      })
      .finally(() => {
        entertainmentStopping = false
      })
    return
  }
  if (!entertainmentWarnPlayed && remaining <= ENTERTAINMENT_WARN_MS) {
    entertainmentWarnPlayed = true
    playEntertainmentWarnSound()
  }
}

async function run<T>(fn: () => Promise<T>) {
  loading.value = true
  error.value = ''
  try {
    return await fn()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败'
    throw err
  } finally {
    loading.value = false
  }
}

export async function refreshState() {
  const next = await fetchState()
  applyState(next)
  return next
}

function onVisible() {
  if (document.visibilityState === 'visible') {
    void refreshState().catch(() => undefined)
  }
}

export async function setupAppState() {
  if (started) {
    await refreshState().catch(() => undefined)
    return
  }
  started = true
  now.value = Date.now()
  tickTimer = setInterval(() => {
    now.value = Date.now()
    tickEntertainmentAlarms()
  }, 1000)
  pollTimer = setInterval(() => {
    void refreshState().catch(() => undefined)
  }, 8000)
  document.addEventListener('visibilitychange', onVisible)
  await refreshState().catch((err) => {
    error.value = err instanceof Error ? err.message : '同步失败'
  })
}

export function teardownAppState() {
  if (!started) return
  started = false
  lastPomodoroPhase = null
  resetEntertainmentAlarms()
  if (tickTimer) clearInterval(tickTimer)
  if (pollTimer) clearInterval(pollTimer)
  tickTimer = null
  pollTimer = null
  document.removeEventListener('visibilitychange', onVisible)
}

export function useAppState() {
  const today = computed(() => state.value?.today ?? null)
  const activeTimer = computed(() => state.value?.activeTimer ?? null)
  const pomodoro = computed(() => state.value?.pomodoro ?? null)
  const todayKey = computed(() => dateKey(now.value))

  function extraElapsed() {
    return extraElapsedMs()
  }

  function entertainmentRemainingMs(category: EntertainmentCategory) {
    return liveEntertainmentRemaining(category)
  }

  function entertainmentLimitMs(category: EntertainmentCategory) {
    const live = state.value?.entertainment
    if (!live) return category === 'video' ? VIDEO_LIMIT_MS : GAME_LIMIT_MS
    return category === 'video' ? live.videoLimitMs : live.gameLimitMs
  }

  function entertainmentBoughtMs(category: EntertainmentCategory) {
    const live = state.value?.entertainment
    if (!live) return 0
    return category === 'video' ? live.videoBoughtMs || 0 : live.gameBoughtMs || 0
  }

  function categoryDisplayMs(category: string) {
    const day = today.value
    if (!day) return 0
    const base =
      category === 'work'
        ? day.workMs
        : category === 'commute'
          ? day.commuteMs
          : category === 'study'
            ? day.studyMs
            : category === 'housework'
              ? day.houseworkMs
              : category === 'social'
                ? day.socialMs
                : category === 'other'
                  ? day.otherMs
                  : category === 'video'
                    ? day.videoMs || 0
                    : category === 'game'
                      ? day.gameMs || 0
                      : day.customMs?.[category] || 0
    return activeTimer.value?.category === category ? base + extraElapsed() : base
  }

  async function handleStartTimer(category: string, otherNote?: string) {
    unlockAudio()
    playStartSound()
    applyState(await run(() => startTimer(category, otherNote)))
  }

  async function handleStopTimer(options?: { silent?: boolean }) {
    if (!options?.silent) {
      unlockAudio()
      playStartSound()
    }
    applyState(await run(() => stopTimer()))
  }

  async function handlePomodoroSettings(settings: PomodoroSettings) {
    applyState(await run(() => savePomodoroSettings(settings)))
  }

  async function handleStartPomodoro() {
    unlockAudio()
    applyState(await run(() => startPomodoro()))
  }

  async function handleEnterBuffer() {
    unlockAudio()
    applyState(await run(() => enterPomodoroBuffer()))
  }

  async function handleEnterRest() {
    unlockAudio()
    applyState(await run(() => enterPomodoroRest()))
  }

  async function handleExitPomodoro() {
    applyState(await run(() => exitPomodoro()))
  }

  async function handleStartExercise() {
    unlockAudio()
    playExerciseStartSound()
    applyState(await run(() => startExercise()))
  }

  async function handleStopExercise(calories?: number) {
    const result = await run(() => stopExercise(calories))
    applyState(result)
    return result
  }

  async function handleCreateTimeModule(title: string) {
    applyState(await run(() => createTimeModule(title)))
  }

  async function handleDeleteTimeModule(id: string) {
    applyState(await run(() => deleteTimeModule(id)))
  }

  async function handleSpendEntertainment(amount: number) {
    applyState(await run(() => spendEntertainment(amount)))
  }

  async function handleExtendEntertainment(category: EntertainmentCategory, amount: number) {
    applyState(await run(() => extendEntertainment(category, amount)))
  }

  return {
    state,
    now,
    loading,
    error,
    today,
    todayKey,
    activeTimer,
    pomodoro,
    customModules: computed(() => state.value?.customModules ?? []),
    hiddenCategories: computed(() => state.value?.hiddenCategories ?? []),
    entertainment: computed(() => state.value?.entertainment ?? null),
    categoryDisplayMs,
    entertainmentRemainingMs,
    entertainmentLimitMs,
    entertainmentBoughtMs,
    refreshState,
    handleStartTimer,
    handleStopTimer,
    handlePomodoroSettings,
    handleStartPomodoro,
    handleEnterBuffer,
    handleEnterRest,
    handleExitPomodoro,
    handleStartExercise,
    handleStopExercise,
    handleCreateTimeModule,
    handleDeleteTimeModule,
    handleSpendEntertainment,
    handleExtendEntertainment,
  }
}
