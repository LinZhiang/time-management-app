<script setup lang="ts">
defineOptions({ name: 'PomodoroView' })

import { computed, ref, watch } from 'vue'
import TimerRing from '../components/TimerRing.vue'
import { useAppState } from '../composables/useAppState'
import { formatDuration } from '../../shared/date.ts'
import {
  REST_MINUTES_MAX,
  REST_MINUTES_MIN,
  STUDY_MINUTES_MAX,
  STUDY_MINUTES_MIN,
} from '../../shared/types.ts'

const {
  loading,
  error,
  now,
  today,
  pomodoro,
  handlePomodoroSettings,
  handleStartPomodoro,
  handleEnterRest,
  handleExitPomodoro,
} = useAppState()

const studyMinutes = ref(pomodoro.value?.settings.studyMinutes ?? 25)
const restMinutes = ref(pomodoro.value?.settings.restMinutes ?? 10)
const autoRestLock = ref(false)

watch(
  () => pomodoro.value?.settings,
  (settings) => {
    if (!settings) return
    studyMinutes.value = settings.studyMinutes
    restMinutes.value = settings.restMinutes
  },
  { immediate: true },
)

const phase = computed(() => pomodoro.value?.phase ?? 'idle')
const targetMs = computed(() => {
  const settings = pomodoro.value?.settings
  if (!settings) return 0
  return (phase.value === 'resting' ? settings.restMinutes : settings.studyMinutes) * 60 * 1000
})

const elapsedMs = computed(() => {
  if (phase.value === 'idle' || !pomodoro.value?.startedAt) return 0
  return Math.max(0, now.value - pomodoro.value.startedAt)
})

const remainingMs = computed(() => Math.max(0, targetMs.value - elapsedMs.value))
const progress = computed(() => {
  if (!targetMs.value) return 0
  return Math.min(1, elapsedMs.value / targetMs.value)
})

const modeLabel = computed(() => {
  if (phase.value === 'studying') return '番茄学习中'
  if (phase.value === 'resting') return '休息中'
  return '休整日番茄学习'
})

const hintText = computed(() => {
  if (phase.value === 'studying') return '学习时间会计入时间管理'
  if (phase.value === 'resting') return '休息中，已停止记录学习时间'
  return '开启后会同步开始学习时间，并关掉其他计时'
})

const ringVariant = computed(() => (phase.value === 'resting' ? 'rest' : 'study'))
const displayTime = computed(() => formatDuration(phase.value === 'idle' ? targetMs.value || studyMinutes.value * 60 * 1000 : remainingMs.value))

watch(remainingMs, async (value) => {
  if (phase.value !== 'studying' || autoRestLock.value) return
  if (value > 0) return
  autoRestLock.value = true
  try {
    await handleEnterRest()
  } catch {
    autoRestLock.value = false
  }
})

watch(phase, (value) => {
  if (value !== 'studying') autoRestLock.value = false
})

async function saveSettings() {
  await handlePomodoroSettings({
    studyMinutes: studyMinutes.value,
    restMinutes: restMinutes.value,
  })
}

async function handlePrimary() {
  if (phase.value === 'idle') {
    await saveSettings()
    await handleStartPomodoro()
    return
  }
  if (phase.value === 'studying') {
    await handleEnterRest()
    return
  }
  await handleStartPomodoro()
}

const primaryLabel = computed(() => {
  if (phase.value === 'idle') return '开启番茄学习'
  if (phase.value === 'studying') return '进入休息'
  return '开始下一轮'
})
</script>

<template>
  <div class="page pomo-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card pause-day-banner">
      <p class="pause-day-banner__title">番茄学习</p>
      <p class="pause-day-banner__desc">
        学习 22～52 分钟，休息 7～15 分钟。开启后同步时间管理中的学习时间；进入休息或退出后停止记录。
      </p>
    </section>

    <section class="card timer-card">
      <p class="timer-card__mode">{{ modeLabel }}</p>
      <TimerRing :progress="progress" :time="displayTime" :hint="hintText" :variant="ringVariant" />
      <button class="btn btn--primary btn--large timer-card__action" type="button" :disabled="loading" @click="handlePrimary">
        {{ primaryLabel }}
      </button>
      <button
        v-if="phase !== 'idle'"
        class="btn btn--ghost btn--small timer-card__exit"
        type="button"
        :disabled="loading"
        @click="handleExitPomodoro"
      >
        退出番茄
      </button>
    </section>

    <section class="pomodoro-summary">
      <div class="pomodoro-summary__card">
        <span class="pomodoro-summary__value">{{ today?.pomodoroCount ?? 0 }}</span>
        <span class="pomodoro-summary__label">今日番茄</span>
      </div>
      <div class="pomodoro-summary__info card">
        <div class="info-row">
          <span class="info-row__label">本轮学习</span>
          <span class="info-row__value">{{ pomodoro?.settings.studyMinutes ?? studyMinutes }} 分钟</span>
        </div>
        <div class="info-row">
          <span class="info-row__label">本轮休息</span>
          <span class="info-row__value">{{ pomodoro?.settings.restMinutes ?? restMinutes }} 分钟</span>
        </div>
      </div>
    </section>

    <section class="card settings-card">
      <h3 class="settings-card__title">时长设置</h3>
      <label class="field">
        <span class="field__label">学习时间（{{ STUDY_MINUTES_MIN }}～{{ STUDY_MINUTES_MAX }} 分钟）</span>
        <input
          v-model.number="studyMinutes"
          class="field__input"
          type="number"
          :min="STUDY_MINUTES_MIN"
          :max="STUDY_MINUTES_MAX"
          :disabled="phase !== 'idle'"
        />
      </label>
      <label class="field">
        <span class="field__label">休息时间（{{ REST_MINUTES_MIN }}～{{ REST_MINUTES_MAX }} 分钟）</span>
        <input
          v-model.number="restMinutes"
          class="field__input"
          type="number"
          :min="REST_MINUTES_MIN"
          :max="REST_MINUTES_MAX"
          :disabled="phase !== 'idle'"
        />
      </label>
      <button class="btn btn--ghost btn--small" type="button" :disabled="phase !== 'idle' || loading" @click="saveSettings">
        保存时长
      </button>
    </section>
  </div>
</template>

<style scoped>
.pomo-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pause-day-banner {
  padding: 14px 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.pause-day-banner__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #c45c26;
}

.pause-day-banner__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.timer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px 20px;
  gap: 20px;
}

.timer-card__mode {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.timer-card__action,
.timer-card__exit {
  width: 100%;
}

.pomodoro-summary {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.pomodoro-summary__card {
  flex-shrink: 0;
  width: 108px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.pomodoro-summary__value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.pomodoro-summary__label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pomodoro-summary__info {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.info-row__label {
  color: var(--color-text-secondary);
}

.info-row__value {
  font-weight: 600;
}

.settings-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-card__title {
  margin: 0;
  font-size: 15px;
}
</style>
