<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue'
import { fetchLongTerm, fetchStats } from '../api/client'
import { dateKey, formatDateRangeLabel, formatDuration, formatDurationText, monthStart } from '../../shared/date.ts'
import type {
  CustomTimeModule,
  DayRecord,
  HiddenTimeCategory,
  LongTermOverview,
  LongTermPeriod,
} from '../../shared/types.ts'

const scope = ref<'today' | 'month' | 'range'>('today')
const loading = ref(false)
const error = ref('')
const total = ref<DayRecord | null>(null)
const days = ref<DayRecord[]>([])
const from = ref('')
const to = ref('')
const overview = ref<LongTermOverview>({ title: '', detail: '', updatedAt: 0 })
const currentPeriods = ref<LongTermPeriod[]>([])
const overviewOpen = ref(false)
const customModules = ref<CustomTimeModule[]>([])
const hiddenCategories = ref<HiddenTimeCategory[]>([])
const showRangeModal = ref(false)
const rangeFrom = ref(monthStart(dateKey()))
const rangeTo = ref(dateKey())
const rangeError = ref('')

const otherDays = computed(() => days.value.filter((day) => day.otherMs > 0 && day.otherDetails.length > 0))
const hasOverview = computed(() => Boolean(overview.value.title || overview.value.detail))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const range = scope.value === 'range' ? { from: from.value, to: to.value } : undefined
    const [result, longTerm] = await Promise.all([fetchStats(scope.value, range), fetchLongTerm()])
    total.value = result.total
    days.value = result.days
    from.value = result.from
    to.value = result.to
    customModules.value = result.customModules ?? []
    hiddenCategories.value = result.hiddenCategories ?? []
    overview.value = longTerm.overview
    currentPeriods.value = longTerm.currentPeriods
  } catch (err) {
    error.value = err instanceof Error ? err.message : '统计加载失败'
  } finally {
    loading.value = false
  }
}

watch(scope, (next, previous) => {
  if (next === 'range' && previous !== 'range') return
  void load()
})

onActivated(() => {
  void load()
})
void load()

const items = computed(() => {
  const data = total.value
  if (!data) return []
  const hidden = new Set(hiddenCategories.value)
  const rows: { label: string; value: string; raw: number }[] = []
  const push = (id: string, label: string, raw: number, text = formatDurationText(raw)) => {
    if (hidden.has(id as HiddenTimeCategory)) return
    rows.push({ label, value: text, raw })
  }
  push('work', '工作时间', data.workMs)
  push('commute', '交通出行时间', data.commuteMs)
  push('study', '学习时间', data.studyMs)
  rows.push({ label: '锻炼时间', value: formatDurationText(data.exerciseMs), raw: data.exerciseMs })
  rows.push({
    label: '锻炼大卡量',
    value: `${data.exerciseCalories} 大卡`,
    raw: data.exerciseCalories,
  })
  push('housework', '做饭家务时间', data.houseworkMs)
  push('social', '应酬出行时间', data.socialMs)
  for (const module of customModules.value) {
    const ms = data.customMs?.[module.id] || 0
    rows.push({ label: module.title, value: formatDurationText(ms), raw: ms })
  }
  push('other', '其他时间', data.otherMs)
  return rows
})

const rangeHint = computed(() => {
  if (scope.value === 'today') return '统计当天已记录时间'
  if (from.value && to.value) return `${from.value} 至 ${to.value}`
  return '请选择时间范围'
})

function openRangeModal() {
  rangeFrom.value = from.value || monthStart(dateKey())
  rangeTo.value = to.value || dateKey()
  rangeError.value = ''
  showRangeModal.value = true
}

function confirmRange() {
  if (!rangeFrom.value || !rangeTo.value) {
    rangeError.value = '请选择开始和结束日期'
    return
  }
  if (rangeFrom.value > rangeTo.value) {
    rangeError.value = '开始日期不能晚于结束日期'
    return
  }
  from.value = rangeFrom.value
  to.value = rangeTo.value
  scope.value = 'range'
  showRangeModal.value = false
  void load()
}
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
      <button class="chip" :class="{ 'chip--active': scope === 'range' }" type="button" @click="openRangeModal">
        时间范围
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else class="range-hint">{{ rangeHint }}</p>

    <section class="card stats-list">
      <div v-for="item in items" :key="item.label" class="stats-item">
        <span class="stats-item__label">{{ item.label }}</span>
        <strong class="stats-item__value">{{ loading ? '…' : item.value }}</strong>
      </div>
    </section>

    <section v-if="currentPeriods.length" class="card plan-card">
      <h3 class="plan-card__title">当前时间段计划</h3>
      <p class="plan-card__desc">今天正好落在下面这些长期安排里。</p>
      <article v-for="period in currentPeriods" :key="period.id" class="plan-card__item">
        <span class="plan-card__range">{{ formatDateRangeLabel(period.startDate, period.endDate) }}</span>
        <strong>{{ period.title }}</strong>
        <p v-if="period.detail">{{ period.detail }}</p>
      </article>
    </section>

    <section class="card plan-card">
      <button class="plan-card__toggle" type="button" @click="overviewOpen = !overviewOpen">
        <span>
          <strong class="plan-card__title">整体安排</strong>
          <span class="plan-card__desc">{{ hasOverview ? '展开查看长期总计划' : '还没有写整体安排' }}</span>
        </span>
        <span class="plan-card__arrow">{{ overviewOpen ? '收起' : '展开' }}</span>
      </button>
      <div v-if="overviewOpen" class="plan-card__body">
        <template v-if="hasOverview">
          <strong v-if="overview.title">{{ overview.title }}</strong>
          <p>{{ overview.detail || '没有填写详情' }}</p>
        </template>
        <p v-else class="empty-hint">去「计划安排 → 长期安排」里写一份整体安排。</p>
      </div>
    </section>

    <section v-if="total && total.otherMs > 0" class="card other-card">
      <h3 class="other-card__title">其他时间明细</h3>
      <p class="other-card__desc">含手动填写的其他时间，以及已删除模块归入这里的时间。</p>
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
        <p v-if="otherDays.length === 0" class="empty-hint">这个范围内暂无其他时间明细。</p>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showRangeModal" class="modal-mask" @click.self="showRangeModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">选择时间范围</h3>
          <p class="modal-panel__hint">确定后会统计这段日期内的全部记录。</p>
          <div class="range-fields">
            <label class="field">
              <span class="field__label">开始日期</span>
              <input v-model="rangeFrom" class="field__input" type="date" />
            </label>
            <label class="field">
              <span class="field__label">结束日期</span>
              <input v-model="rangeTo" class="field__input" type="date" />
            </label>
          </div>
          <p v-if="rangeError" class="form-error">{{ rangeError }}</p>
          <button class="btn btn--primary btn--large range-submit" type="button" :disabled="loading" @click="confirmRange">
            确定
          </button>
          <button class="btn btn--ghost btn--small range-cancel" type="button" @click="showRangeModal = false">
            取消
          </button>
        </div>
      </div>
    </Teleport>
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
  flex-wrap: wrap;
  gap: 10px;
}

.range-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.range-submit {
  width: 100%;
  margin-top: 14px;
}

.range-cancel {
  width: 100%;
  margin-top: 8px;
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

.plan-card,
.other-card {
  padding: 16px;
}

.plan-card__title {
  margin: 0;
  font-size: 15px;
  display: block;
}

.plan-card__desc,
.plan-card__item p,
.plan-card__body p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.plan-card__item {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-card__item + .plan-card__item {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.plan-card__range {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
}

.plan-card__item strong,
.plan-card__body strong {
  font-size: 15px;
}

.plan-card__toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  color: inherit;
}

.plan-card__arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-primary);
}

.plan-card__arrow--open {
  opacity: 0.7;
}

.plan-card__body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
