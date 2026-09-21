<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  progress: number
  time: string
  hint: string
  variant?: 'study' | 'rest' | 'alert' | 'exercise'
}>()

const offset = computed(() =>
  Math.round(553 * (1 - Math.min(1, Math.max(0, props.progress)))),
)
</script>

<template>
  <div class="timer-ring">
    <svg class="timer-ring__svg" viewBox="0 0 200 200">
      <circle class="timer-ring__track" cx="100" cy="100" r="88" />
      <circle
        class="timer-ring__progress"
        :class="`timer-ring__progress--${variant ?? 'study'}`"
        cx="100"
        cy="100"
        r="88"
        :style="{ strokeDashoffset: offset }"
      />
    </svg>
    <div class="timer-ring__center">
      <span class="timer-ring__time">{{ time }}</span>
      <span class="timer-ring__hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.timer-ring {
  position: relative;
  width: 220px;
  height: 220px;
}

.timer-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-ring__track {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 8;
}

.timer-ring__progress {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 553;
  transition: stroke-dashoffset 0.3s ease, stroke 0.3s ease;
}

.timer-ring__progress--rest {
  stroke: #3d7ea6;
}

.timer-ring__progress--alert,
.timer-ring__progress--exercise {
  stroke: #c45c26;
}

.timer-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.timer-ring__time {
  font-size: 42px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  color: var(--color-text);
}

.timer-ring__hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 0 12px;
}
</style>
