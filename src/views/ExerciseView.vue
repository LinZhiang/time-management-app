<script setup lang="ts">
defineOptions({ name: 'ExerciseView' })

import { computed, ref, watch } from 'vue'
import TimerRing from '../components/TimerRing.vue'
import { useAppState } from '../composables/useAppState'
import { formatDuration } from '../../shared/date.ts'
import { EXERCISE_MIN_MS } from '../../shared/types.ts'

const {
  loading,
  error,
  now,
  today,
  activeTimer,
  handleStartExercise,
  handleStopExercise,
} = useAppState()

const showCalorieModal = ref(false)
const calorieInput = ref('')
const calorieError = ref('')
const pendingStop = ref(false)

const running = computed(() => activeTimer.value?.category === 'exercise')
const elapsedMs = computed(() => {
  if (!running.value || !activeTimer.value) return 0
  return Math.max(0, now.value - activeTimer.value.startedAt)
})
const reachedMin = computed(() => elapsedMs.value >= EXERCISE_MIN_MS)
const remainingMs = computed(() => Math.max(0, EXERCISE_MIN_MS - elapsedMs.value))
const progress = computed(() => Math.min(1, elapsedMs.value / EXERCISE_MIN_MS))
const displayTime = computed(() =>
  running.value
    ? reachedMin.value
      ? formatDuration(elapsedMs.value)
      : formatDuration(remainingMs.value)
    : '00:30:00',
)
const hintText = computed(() => {
  if (!running.value) return '未满 30 分钟停止，锻炼时间和大卡都记为 0'
  if (!reachedMin.value) return '倒计时到 30 分钟后才可记录锻炼'
  return '已满 30 分钟，停止后记录总时长和大卡'
})

watch(running, (value) => {
  if (!value) showCalorieModal.value = false
})

async function handleStop() {
  if (!running.value || pendingStop.value) return
  if (!reachedMin.value) {
    pendingStop.value = true
    try {
      await handleStopExercise()
    } finally {
      pendingStop.value = false
    }
    return
  }
  calorieInput.value = ''
  calorieError.value = ''
  showCalorieModal.value = true
}

async function confirmCalories() {
  calorieError.value = ''
  const calories = Number(String(calorieInput.value).trim())
  if (!Number.isFinite(calories) || calories <= 0) {
    calorieError.value = '请填写大于 0 的锻炼大卡量'
    return
  }
  pendingStop.value = true
  try {
    await handleStopExercise(calories)
    showCalorieModal.value = false
  } catch (err) {
    calorieError.value = err instanceof Error ? err.message : '提交失败'
  } finally {
    pendingStop.value = false
  }
}
</script>

<template>
  <div class="page exercise-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card timer-card">
      <p class="timer-card__mode">{{ running ? (reachedMin ? '运动已达标' : '运动倒计时') : '准备运动' }}</p>
      <TimerRing
        :progress="running ? progress : 0"
        :time="displayTime"
        :hint="hintText"
        :variant="reachedMin ? 'exercise' : 'study'"
      />
      <button
        v-if="!running"
        class="btn btn--primary btn--large timer-card__action"
        type="button"
        :disabled="loading"
        @click="handleStartExercise"
      >
        开启运动
      </button>
      <button
        v-else
        class="btn btn--danger btn--large timer-card__action"
        type="button"
        :disabled="loading || pendingStop"
        @click="handleStop"
      >
        停止运动
      </button>
    </section>

    <section class="stats-row">
      <div class="card stats-row__item">
        <span class="stats-row__value">{{ formatDuration(today?.exerciseMs ?? 0) }}</span>
        <span class="stats-row__label">今日锻炼</span>
      </div>
      <div class="card stats-row__item">
        <span class="stats-row__value">{{ today?.exerciseCalories ?? 0 }}</span>
        <span class="stats-row__label">今日大卡</span>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showCalorieModal" class="modal-mask">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">填写锻炼大卡量</h3>
          <p class="modal-panel__hint">本次已锻炼 {{ formatDuration(elapsedMs) }}，请填写消耗的大卡。</p>
          <label class="field">
            <span class="field__label">大卡</span>
            <input
              v-model="calorieInput"
              class="field__input"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              placeholder="例如 180"
              @keydown.enter.prevent="confirmCalories"
            />
          </label>
          <p v-if="calorieError" class="form-error">{{ calorieError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" @click="confirmCalories">
            确认记录
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showCalorieModal = false">
            继续运动
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.exercise-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.modal-submit,
.modal-cancel {
  width: 100%;
}

.modal-submit {
  margin-top: 14px;
}

.modal-cancel {
  margin-top: 8px;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stats-row__item {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-row__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.stats-row__label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
