<script setup lang="ts">
import { onActivated, ref } from 'vue'
import { fetchLogs } from '../api/client'
import { dateKey, formatDateLabel, formatDurationText, monthStart } from '../../shared/date.ts'
import type { DayRecord } from '../../shared/types.ts'

const today = dateKey()
const from = ref(monthStart(today))
const to = ref(today)
const days = ref<DayRecord[]>([])
const loading = ref(false)
const error = ref('')
const expanded = ref<string[]>([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchLogs(from.value, to.value)
    days.value = result.days
  } catch (err) {
    error.value = err instanceof Error ? err.message : '日志加载失败'
  } finally {
    loading.value = false
  }
}

onActivated(() => {
  void load()
})
void load()

function toggle(date: string) {
  expanded.value = expanded.value.includes(date)
    ? expanded.value.filter((item) => item !== date)
    : [...expanded.value, date]
}
</script>

<template>
  <div class="page log-page">
    <section class="card filter-card">
      <div class="filter-row">
        <label class="field">
          <span class="field__label">开始日期</span>
          <input v-model="from" class="field__input" type="date" />
        </label>
        <label class="field">
          <span class="field__label">结束日期</span>
          <input v-model="to" class="field__input" type="date" />
        </label>
      </div>
      <button class="btn btn--primary btn--large" type="button" :disabled="loading" @click="load">
        查看这个区间
      </button>
    </section>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="!loading && days.length === 0" class="empty-hint">
      这个区间没有日志。当天如果没有做任何时间管理操作，就不会记录。
    </p>

    <section v-for="day in days" :key="day.date" class="card day-card">
      <button class="day-card__header" type="button" @click="toggle(day.date)">
        <div>
          <h2>{{ formatDateLabel(day.date) }}</h2>
          <p>番茄 {{ day.pomodoroCount }} · 学习 {{ formatDurationText(day.studyMs) }}</p>
        </div>
        <span class="day-card__arrow" :class="{ 'day-card__arrow--open': expanded.includes(day.date) }">›</span>
      </button>
      <div v-if="expanded.includes(day.date)" class="day-card__body">
        <ul>
          <li><span>工作时间</span><strong>{{ formatDurationText(day.workMs) }}</strong></li>
          <li><span>交通出行时间</span><strong>{{ formatDurationText(day.commuteMs) }}</strong></li>
          <li><span>学习时间</span><strong>{{ formatDurationText(day.studyMs) }}</strong></li>
          <li><span>做饭家务时间</span><strong>{{ formatDurationText(day.houseworkMs) }}</strong></li>
          <li><span>应酬出行时间</span><strong>{{ formatDurationText(day.socialMs) }}</strong></li>
          <li><span>其他时间</span><strong>{{ formatDurationText(day.otherMs) }}</strong></li>
          <li><span>锻炼时间</span><strong>{{ formatDurationText(day.exerciseMs) }}</strong></li>
          <li><span>锻炼大卡量</span><strong>{{ day.exerciseCalories }} 大卡</strong></li>
          <li><span>番茄量</span><strong>{{ day.pomodoroCount }} 轮</strong></li>
        </ul>
        <div v-if="day.otherDetails.length" class="other-block">
          <h3>其他时间明细</h3>
          <p v-for="item in day.otherDetails" :key="item.note">
            {{ item.note }} · {{ formatDurationText(item.ms) }}
          </p>
        </div>
        <div v-if="day.pomodoroRounds.length" class="other-block">
          <h3>番茄轮次</h3>
          <p v-for="(round, index) in day.pomodoroRounds" :key="round.completedAt">
            第 {{ index + 1 }} 轮：学习 {{ round.studyMinutes }} 分钟 / 休息 {{ round.restMinutes }} 分钟
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.log-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.filter-card .btn {
  width: 100%;
}

.empty-hint {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.day-card__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  text-align: left;
}

.day-card__header h2 {
  margin: 0 0 4px;
  font-size: 15px;
}

.day-card__header p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.day-card__arrow {
  font-size: 22px;
  color: var(--color-text-tertiary);
  transform: rotate(90deg);
}

.day-card__arrow--open {
  transform: rotate(-90deg);
}

.day-card__body {
  padding: 0 16px 16px;
}

.day-card__body ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-card__body li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.other-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.other-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.other-block p {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
