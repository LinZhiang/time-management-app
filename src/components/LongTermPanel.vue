<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import {
  createLongTermPeriod,
  deleteLongTermPeriod,
  fetchLongTerm,
  saveLongTermOverview,
  updateLongTermPeriod,
} from '../api/client'
import { dateKey, formatDateRangeLabel } from '../../shared/date.ts'
import type { LongTermOverview, LongTermPeriod } from '../../shared/types.ts'

const today = dateKey()
const loading = ref(false)
const error = ref('')
const overview = ref<LongTermOverview>({ title: '', detail: '', updatedAt: 0 })
const periods = ref<LongTermPeriod[]>([])
const overviewTitle = ref('')
const overviewDetail = ref('')
const overviewSaving = ref(false)
const overviewHint = ref('')
const showPeriodForm = ref(false)
const editingPeriod = ref<LongTermPeriod | null>(null)
const periodTitle = ref('')
const periodDetail = ref('')
const periodStart = ref(today)
const periodEnd = ref(today)
const periodError = ref('')
const periodSaving = ref(false)

const hasOverview = computed(() => Boolean(overview.value.title || overview.value.detail))

function periodStatus(period: LongTermPeriod) {
  if (period.startDate <= today && today <= period.endDate) return 'current'
  if (period.startDate > today) return 'upcoming'
  return 'past'
}

function statusLabel(period: LongTermPeriod) {
  const status = periodStatus(period)
  if (status === 'current') return '进行中'
  if (status === 'upcoming') return '未开始'
  return '已结束'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchLongTerm()
    applyResult(result)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '长期安排加载失败'
  } finally {
    loading.value = false
  }
}

function applyResult(result: { overview: LongTermOverview; periods: LongTermPeriod[] }) {
  overview.value = result.overview
  periods.value = result.periods
  overviewTitle.value = result.overview.title
  overviewDetail.value = result.overview.detail
}

onActivated(() => {
  void load()
})
void load()

async function submitOverview() {
  overviewSaving.value = true
  overviewHint.value = ''
  error.value = ''
  try {
    applyResult(await saveLongTermOverview(overviewTitle.value, overviewDetail.value))
    overviewHint.value = '整体安排已保存，可在工作统计页展开查看'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    overviewSaving.value = false
  }
}

function openCreatePeriod() {
  editingPeriod.value = null
  periodTitle.value = ''
  periodDetail.value = ''
  periodStart.value = today
  periodEnd.value = today
  periodError.value = ''
  showPeriodForm.value = true
}

function openEditPeriod(period: LongTermPeriod) {
  editingPeriod.value = period
  periodTitle.value = period.title
  periodDetail.value = period.detail
  periodStart.value = period.startDate
  periodEnd.value = period.endDate
  periodError.value = ''
  showPeriodForm.value = true
}

async function submitPeriod() {
  periodError.value = ''
  if (!periodTitle.value.trim()) {
    periodError.value = '请填写这个时间段的计划标题'
    return
  }
  if (!periodStart.value || !periodEnd.value) {
    periodError.value = '请选择开始和结束日期'
    return
  }
  if (periodStart.value > periodEnd.value) {
    periodError.value = '开始日期不能晚于结束日期'
    return
  }
  periodSaving.value = true
  try {
    const payload = {
      title: periodTitle.value,
      detail: periodDetail.value,
      startDate: periodStart.value,
      endDate: periodEnd.value,
    }
    const result = editingPeriod.value
      ? await updateLongTermPeriod(editingPeriod.value.id, payload)
      : await createLongTermPeriod(payload)
    applyResult(result)
    showPeriodForm.value = false
  } catch (err) {
    periodError.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    periodSaving.value = false
  }
}

async function removePeriod() {
  if (!editingPeriod.value) return
  periodSaving.value = true
  periodError.value = ''
  try {
    applyResult(await deleteLongTermPeriod(editingPeriod.value.id))
    showPeriodForm.value = false
  } catch (err) {
    periodError.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    periodSaving.value = false
  }
}
</script>

<template>
  <div class="long-term">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card block">
      <h3 class="block__title">整体安排</h3>
      <p class="block__desc">写长期总计划。保存后可在工作统计页展开查看。</p>
      <label class="field">
        <span class="field__label">标题</span>
        <input v-model="overviewTitle" class="field__input" type="text" maxlength="40" placeholder="例如：今年主线" />
      </label>
      <label class="field">
        <span class="field__label">内容</span>
        <textarea
          v-model="overviewDetail"
          class="field__textarea"
          maxlength="800"
          placeholder="把长期要做的事写在这里"
        />
      </label>
      <p v-if="overviewHint" class="block__hint">{{ overviewHint }}</p>
      <button class="btn btn--primary btn--large" type="button" :disabled="overviewSaving" @click="submitOverview">
        {{ overviewSaving ? '保存中…' : hasOverview ? '更新整体安排' : '保存整体安排' }}
      </button>
    </section>

    <section class="period-head">
      <div>
        <h3 class="block__title">时间段安排</h3>
        <p class="block__desc">选一段时间，写入这段的计划。当前日期落在该区间时，工作统计页会显示出来。</p>
      </div>
      <button class="btn btn--ghost btn--small" type="button" @click="openCreatePeriod">插入时间段</button>
    </section>

    <p v-if="!loading && periods.length === 0" class="empty-hint">还没有时间段计划。</p>
    <button
      v-for="period in periods"
      :key="period.id"
      class="card period-item"
      type="button"
      @click="openEditPeriod(period)"
    >
      <div class="period-item__top">
        <span class="period-item__range">{{ formatDateRangeLabel(period.startDate, period.endDate) }}</span>
        <span class="period-item__status" :data-status="periodStatus(period)">{{ statusLabel(period) }}</span>
      </div>
      <strong class="period-item__title">{{ period.title }}</strong>
      <p v-if="period.detail" class="period-item__detail">{{ period.detail }}</p>
    </button>

    <Teleport to="body">
      <div v-if="showPeriodForm" class="modal-mask" @click.self="showPeriodForm = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">{{ editingPeriod ? '编辑时间段计划' : '插入时间段计划' }}</h3>
          <p class="modal-panel__hint">选择开始和结束日期，再写入这段时间要做的安排。</p>
          <div class="date-row">
            <label class="field">
              <span class="field__label">开始</span>
              <input v-model="periodStart" class="field__input" type="date" />
            </label>
            <label class="field">
              <span class="field__label">结束</span>
              <input v-model="periodEnd" class="field__input" type="date" />
            </label>
          </div>
          <label class="field">
            <span class="field__label">标题</span>
            <input v-model="periodTitle" class="field__input" type="text" maxlength="40" />
          </label>
          <label class="field">
            <span class="field__label">详情</span>
            <textarea v-model="periodDetail" class="field__textarea" maxlength="400" />
          </label>
          <p v-if="periodError" class="form-error">{{ periodError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" :disabled="periodSaving" @click="submitPeriod">
            {{ periodSaving ? '保存中…' : '保存' }}
          </button>
          <button
            v-if="editingPeriod"
            class="btn btn--danger btn--small modal-cancel"
            type="button"
            :disabled="periodSaving"
            @click="removePeriod"
          >
            删除这个时间段
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showPeriodForm = false">取消</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.long-term {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.block,
.period-item {
  padding: 16px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block__title {
  margin: 0;
  font-size: 15px;
}

.block__desc,
.block__hint,
.empty-hint,
.period-item__detail {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.block__hint {
  color: var(--color-primary);
}

.period-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.period-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
}

.period-item__top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.period-item__range {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.period-item__status {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

.period-item__status[data-status='current'] {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.period-item__status[data-status='upcoming'] {
  background: #eef4fb;
  color: #3d7ea6;
}

.period-item__title {
  font-size: 15px;
}

.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.modal-submit {
  width: 100%;
  margin-top: 14px;
}

.modal-cancel {
  width: 100%;
  margin-top: 8px;
}
</style>
