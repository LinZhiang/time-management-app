<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue'
import { fetchStats } from '../api/client'
import { formatDuration, formatDurationText } from '../../shared/date.ts'
import type { DayRecord } from '../../shared/types.ts'

const scope = ref<'today' | 'month'>('today')
const loading = ref(false)
const error = ref('')
const total = ref<DayRecord | null>(null)
const days = ref<DayRecord[]>([])
const from = ref('')
const to = ref('')

const otherDays = computed(() => days.value.filter((day) => day.otherMs > 0 && day.otherDetails.length > 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchStats(scope.value)
    total.value = result.total
    days.value = result.days
    from.value = result.from
    to.value = result.to
  } catch (err) {
    error.value = err instanceof Error ? err.message : '统计加载失败'
  } finally {
    loading.value = false
  }
}

watch(scope, () => {
  void load()
})

onActivated(() => {
  void load()
})
void load()

const items = computed(() => {
  const data = total.value
  if (!data) return []
  return [
    { label: '工作时间', value: formatDurationText(data.workMs), raw: data.workMs },
    { label: '交通出行时间', value: formatDurationText(data.commuteMs), raw: data.commuteMs },
    { label: '学习时间', value: formatDurationText(data.studyMs), raw: data.studyMs },
    { label: '锻炼时间', value: formatDurationText(data.exerciseMs), raw: data.exerciseMs },
    { label: '锻炼大卡量', value: `${data.exerciseCalories} 大卡`, raw: data.exerciseCalories },
    { label: '做饭家务时间', value: formatDurationText(data.houseworkMs), raw: data.houseworkMs },
    { label: '应酬出行时间', value: formatDurationText(data.socialMs), raw: data.socialMs },
    { label: '其他时间', value: formatDurationText(data.otherMs), raw: data.otherMs },
  ]
})
</script>

<template>
  <div class="page stats-page">
    <div class="scope-tabs" role="tablist">
      <button class="chip" :class="{ 'chip--active': scope === 'today' }" type="button" @click="scope = 'today'">
        当天
      </button>
      <button class="chip" :class="{ 'chip--active': scope === 'month' }" type="button" @click="scope = 'month'">
        一个月
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else class="range-hint">{{ scope === 'today' ? '统计当天已记录时间' : `${from} 至 ${to}` }}</p>

    <section class="card stats-list">
      <div v-for="item in items" :key="item.label" class="stats-item">
        <span class="stats-item__label">{{ item.label }}</span>
        <strong class="stats-item__value">{{ loading ? '…' : item.value }}</strong>
      </div>
    </section>

    <section v-if="total && total.otherMs > 0" class="card other-card">
      <h3 class="other-card__title">其他时间明细</h3>
      <p class="other-card__desc">当天有其他时间时，会按具体内容动态展示。</p>
      <div v-if="scope === 'today'">
        <ul v-if="total.otherDetails.length" class="other-list">
          <li v-for="item in total.otherDetails" :key="item.note">
            <span>{{ item.note }}</span>
            <strong>{{ formatDuration(item.ms) }}</strong>
          </li>
        </ul>
        <p v-else class="empty-hint">已有其他时间，但还没有填写具体说明。</p>
      </div>
      <div v-else>
        <article v-for="day in otherDays" :key="day.date" class="other-day">
          <h4>{{ day.date }}</h4>
          <ul class="other-list">
            <li v-for="item in day.otherDetails" :key="`${day.date}-${item.note}`">
              <span>{{ item.note }}</span>
              <strong>{{ formatDuration(item.ms) }}</strong>
            </li>
          </ul>
        </article>
        <p v-if="otherDays.length === 0" class="empty-hint">本月暂无其他时间明细。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scope-tabs {
  display: flex;
  gap: 10px;
}

.range-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.stats-list {
  overflow: hidden;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-item__label {
  font-size: 14px;
}

.stats-item__value {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.other-card {
  padding: 16px;
}

.other-card__title {
  margin: 0 0 6px;
  font-size: 15px;
}

.other-card__desc {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.other-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.other-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.other-day + .other-day {
  margin-top: 14px;
}

.other-day h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.empty-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
