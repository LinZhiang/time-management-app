import { computed, ref, shallowRef } from 'vue'
import {
  enterPomodoroRest,
  exitPomodoro,
  fetchState,
  savePomodoroSettings,
  startExercise,
  startPomodoro,
  startTimer,
  stopExercise,
  stopTimer,
} from '../api/client'
import { dateKey } from '../../shared/date.ts'
import type { LiveState, PomodoroSettings, TimeCategory } from '../../shared/types.ts'

const state = shallowRef<LiveState | null>(null)
const now = ref(Date.now())
const loading = ref(false)
const error = ref('')
let tickTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let started = false

function applyState(next: LiveState) {
  state.value = next
  now.value = next.now || Date.now()
  error.value = ''
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
    const syncedAt = state.value?.now ?? now.value
    return Math.max(0, now.value - syncedAt)
  }

  function categoryDisplayMs(category: TimeCategory) {
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
                : day.otherMs
    return activeTimer.value?.category === category ? base + extraElapsed() : base
  }

  async function handleStartTimer(category: TimeCategory, otherNote?: string) {
    applyState(await run(() => startTimer(category, otherNote)))
  }

  async function handleStopTimer() {
    applyState(await run(() => stopTimer()))
  }

  async function handlePomodoroSettings(settings: PomodoroSettings) {
    applyState(await run(() => savePomodoroSettings(settings)))
  }

  async function handleStartPomodoro() {
    applyState(await run(() => startPomodoro()))
  }

  async function handleEnterRest() {
    applyState(await run(() => enterPomodoroRest()))
  }

  async function handleExitPomodoro() {
    applyState(await run(() => exitPomodoro()))
  }

  async function handleStartExercise() {
    applyState(await run(() => startExercise()))
  }

  async function handleStopExercise(calories?: number) {
    const result = await run(() => stopExercise(calories))
    applyState(result)
    return result
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
    categoryDisplayMs,
    refreshState,
    handleStartTimer,
    handleStopTimer,
    handlePomodoroSettings,
    handleStartPomodoro,
    handleEnterRest,
    handleExitPomodoro,
    handleStartExercise,
    handleStopExercise,
  }
}
