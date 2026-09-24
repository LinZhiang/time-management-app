<script setup lang="ts">
defineOptions({ name: 'PlanView' })

import { computed, onActivated, ref, watch } from 'vue'
import LongTermPanel from '../components/LongTermPanel.vue'
import { createPlan, fetchPlans } from '../api/client'
import {
  addDays,
  dateKey,
  formatDateLabel,
  formatMonthLabel,
  monthEnd,
  monthStart,
  pad2,
  weekdayIndex,
  yearEnd,
  yearStart,
} from '../../shared/date.ts'
import type { Plan } from '../../shared/types.ts'

const pageTab = ref<'daily' | 'longterm'>('daily')
const viewMode = ref<'list' | 'calendar'>('list')
const rangeMode = ref<'month' | 'year'>('month')
const today = dateKey()
const cursorMonth = ref(today.slice(0, 7))
const selectedYear = ref(today.slice(0, 4))
const plans = ref<Plan[]>([])
const loading = ref(false)
const error = ref('')
const showCreate = ref(false)
const showDetail = ref<Plan | null>(null)
const title = ref('')
const detail = ref('')
const formError = ref('')

const range = computed(() => {
  if (rangeMode.value === 'year') {
    const date = `${selectedYear.value}-01-01`
    return { from: yearStart(date), to: yearEnd(date) }
  }
  const date = `${cursorMonth.value}-01`
  return { from: monthStart(date), to: monthEnd(date) }
})

const calendarMonth = computed(() => {
  if (rangeMode.value === 'year') return cursorMonth.value
  return cursorMonth.value
})

const calendarDays = computed(() => {
  const monthDate = `${calendarMonth.value}-01`
  const start = monthStart(monthDate)
  const end = monthEnd(monthDate)
  const lead = (weekdayIndex(start) + 6) % 7
  const days: { date: string; inMonth: boolean }[] = []
  for (let i = lead; i > 0; i -= 1) {
    days.push({ date: addDays(start, -i), inMonth: false })
  }
  let cursor = start
  while (cursor <= end) {
    days.push({ date: cursor, inMonth: true })
    cursor = addDays(cursor, 1)
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1]
    days.push({ date: addDays(last?.date ?? end, 1), inMonth: false })
  }
  return days
})

const planCountByDate = computed(() => {
  const map: Record<string, number> = {}
  for (const plan of plans.value) {
    map[plan.date] = (map[plan.date] ?? 0) + 1
  }
  return map
})

const monthPlans = computed(() =>
  plans.value.filter((plan) => plan.date.startsWith(calendarMonth.value)),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchPlans(range.value.from, range.value.to)
    plans.value = result.plans
  } catch (err) {
    error.value = err instanceof Error ? err.message : '计划加载失败'
  } finally {
    loading.value = false
  }
}

watch([rangeMode, cursorMonth, selectedYear], () => {
  if (rangeMode.value === 'year' && !cursorMonth.value.startsWith(selectedYear.value)) {
    cursorMonth.value = `${selectedYear.value}-${today.slice(5, 7)}`
  }
  void load()
})

onActivated(() => {
  void load()
})
void load()

function shiftMonth(delta: number) {
  const [year, month] = cursorMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  const next = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
  if (rangeMode.value === 'year' && !next.startsWith(selectedYear.value)) return
  cursorMonth.value = next
}

function canShift(delta: number) {
  if (rangeMode.value !== 'year') return true
  const [year, month] = cursorMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return String(date.getFullYear()) === selectedYear.value
}

async function submitPlan() {
  formError.value = ''
  if (!title.value.trim()) {
    formError.value = '请填写计划标题'
    return
  }
  try {
    await createPlan(title.value, detail.value)
    title.value = ''
    detail.value = ''
    showCreate.value = false
    await load()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '新增失败'
  }
}

function openDay(date: string) {
  const found = plans.value.filter((plan) => plan.date === date)
  if (found.length === 1) showDetail.value = found[0] ?? null
  else if (found.length > 1) {
    viewMode.value = 'list'
  }
}
</script>

<template>
  <div class="page plan-page">
    <div class="page-tabs" role="tablist">
      <button
        class="chip"
        :class="{ 'chip--active': pageTab === 'daily' }"
        type="button"
        @click="pageTab = 'daily'"
      >
        日程安排
      </button>
      <button
        class="chip"
        :class="{ 'chip--active': pageTab === 'longterm' }"
        type="button"
        @click="pageTab = 'longterm'"
      >
        长期安排
      </button>
    </div>

    <LongTermPanel v-if="pageTab === 'longterm'" />

    <template v-else>
    <div class="toolbar">
      <div class="scope-tabs">
        <button class="chip" :class="{ 'chip--active': viewMode === 'list' }" type="button" @click="viewMode = 'list'">
          列表
        </button>
        <button class="chip" :class="{ 'chip--active': viewMode === 'calendar' }" type="button" @click="viewMode = 'calendar'">
          日历
        </button>
      </div>
      <div class="scope-tabs">
        <button class="chip" :class="{ 'chip--active': rangeMode === 'month' }" type="button" @click="rangeMode = 'month'">
          按月
        </button>
        <button class="chip" :class="{ 'chip--active': rangeMode === 'year' }" type="button" @click="rangeMode = 'year'">
          按年
        </button>
      </div>
    </div>

    <section class="card range-card">
      <label v-if="rangeMode === 'year'" class="field">
        <span class="field__label">年份</span>
        <input v-model="selectedYear" class="field__input" type="number" min="2020" max="2100" />
      </label>
      <label v-else class="field">
        <span class="field__label">月份</span>
        <input v-model="cursorMonth" class="field__input" type="month" />
      </label>
      <p class="range-card__text">
        {{ rangeMode === 'year' ? `${selectedYear}年 · 日历按月左右查看` : formatMonthLabel(`${cursorMonth}-01`) }}
      </p>
    </section>

    <button class="btn btn--primary btn--large add-btn" type="button" @click="showCreate = true">
      新增当天计划
    </button>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section v-if="viewMode === 'list'" class="plan-list">
      <p v-if="!loading && plans.length === 0" class="empty-hint">这个区间还没有计划。</p>
      <button
        v-for="plan in plans"
        :key="plan.id"
        class="card plan-list__item"
        type="button"
        @click="showDetail = plan"
      >
        <span class="plan-list__date">{{ formatDateLabel(plan.date) }}</span>
        <strong class="plan-list__title">{{ plan.title }}</strong>
      </button>
    </section>

    <section v-else class="card calendar-card">
      <div class="calendar-nav">
        <button class="chip" type="button" :disabled="!canShift(-1)" @click="shiftMonth(-1)">上一月</button>
        <strong>{{ formatMonthLabel(`${calendarMonth}-01`) }}</strong>
        <button class="chip" type="button" :disabled="!canShift(1)" @click="shiftMonth(1)">下一月</button>
      </div>
      <div class="calendar-week">
        <span v-for="label in ['一', '二', '三', '四', '五', '六', '日']" :key="label">{{ label }}</span>
      </div>
      <div class="calendar-grid">
        <button
          v-for="day in calendarDays"
          :key="day.date + String(day.inMonth)"
          class="calendar-day"
          :class="{
            'calendar-day--muted': !day.inMonth,
            'calendar-day--today': day.date === today,
            'calendar-day--has': day.inMonth && planCountByDate[day.date],
          }"
          type="button"
          @click="day.inMonth && openDay(day.date)"
        >
          <span class="calendar-day__num">{{ Number(day.date.slice(8)) }}</span>
          <span v-if="day.inMonth && planCountByDate[day.date]" class="calendar-day__count">
            {{ planCountByDate[day.date] }} 条
          </span>
        </button>
      </div>
      <p class="calendar-hint">日历始终展示一个月；按年时可左右切换该年各月。点日期可看当天计划。</p>
      <div v-if="monthPlans.length" class="month-mini-list">
        <button
          v-for="plan in monthPlans"
          :key="plan.id"
          class="month-mini-list__item"
          type="button"
          @click="showDetail = plan"
        >
          {{ plan.title }}
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showCreate" class="modal-mask" @click.self="showCreate = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">新增当天计划</h3>
          <p class="modal-panel__hint">只能添加今天（{{ formatDateLabel(today) }}）的计划。</p>
          <label class="field">
            <span class="field__label">标题</span>
            <input v-model="title" class="field__input" type="text" maxlength="40" />
          </label>
          <label class="field" style="margin-top: 12px">
            <span class="field__label">详情</span>
            <textarea v-model="detail" class="field__textarea" maxlength="400" />
          </label>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" @click="submitPlan">保存</button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showCreate = false">取消</button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDetail" class="modal-mask" @click.self="showDetail = null">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">{{ showDetail.title }}</h3>
          <p class="modal-panel__hint">{{ formatDateLabel(showDetail.date) }}</p>
          <p class="detail-text">{{ showDetail.detail || '没有填写详情' }}</p>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showDetail = null">关闭</button>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-tabs,
.toolbar,
.scope-tabs {
  display: flex;
  gap: 10px;
}

.toolbar {
  justify-content: space-between;
}

.range-card,
.calendar-card {
  padding: 16px;
}

.range-card__text,
.calendar-hint,
.empty-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.add-btn,
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

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  text-align: left;
}

.plan-list__date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.plan-list__title {
  font-size: 15px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.calendar-week,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-week {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}

.calendar-day {
  position: relative;
  min-height: 52px;
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
}

.calendar-day__num {
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.calendar-day__count {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: inherit;
  opacity: 0.95;
}

.calendar-day--muted {
  opacity: 0.35;
}

.calendar-day--today:not(.calendar-day--has) {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 700;
}

.calendar-day--has {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 10px rgb(26 107 92 / 28%);
}

.calendar-day--has.calendar-day--today {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--color-primary), 0 4px 10px rgb(26 107 92 / 28%);
}

.month-mini-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.month-mini-list__item {
  border: 1px solid rgba(26, 107, 92, 0.22);
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
}

.detail-text {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
