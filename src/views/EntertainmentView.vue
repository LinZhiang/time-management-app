<script setup lang="ts">
defineOptions({ name: 'EntertainmentView' })

import { computed, ref } from 'vue'
import TimerRing from '../components/TimerRing.vue'
import { useAppState } from '../composables/useAppState'
import { extraMsForYuan } from '../../shared/record.ts'
import { formatDuration } from '../../shared/date.ts'
import {
  ENTERTAINMENT_WARN_MS,
  GAME_MS_PER_YUAN,
  VIDEO_MS_PER_YUAN,
  type EntertainmentCategory,
} from '../../shared/types.ts'

const {
  loading,
  error,
  activeTimer,
  entertainment,
  entertainmentRemainingMs,
  entertainmentLimitMs,
  entertainmentBoughtMs,
  handleStartTimer,
  handleStopTimer,
  handleSpendEntertainment,
  handleExtendEntertainment,
} = useAppState()

const showSpendModal = ref(false)
const spendInput = ref('')
const spendError = ref('')
const showExtendModal = ref(false)
const extendCategory = ref<EntertainmentCategory>('video')
const extendInput = ref('1')
const extendError = ref('')

const items = computed(() => {
  return [
    {
      id: 'video' as const,
      title: '视频时间',
      remaining: entertainmentRemainingMs('video'),
      limit: entertainmentLimitMs('video'),
      bought: entertainmentBoughtMs('video'),
      baseText: '每天基础 1 小时',
      rateText: '1 元可买 3 分钟',
    },
    {
      id: 'game' as const,
      title: '游戏时间',
      remaining: entertainmentRemainingMs('game'),
      limit: entertainmentLimitMs('game'),
      bought: entertainmentBoughtMs('game'),
      baseText: '每天基础 30 分钟',
      rateText: '1 元可买 1.5 分钟',
    },
  ]
})

const grants = computed(() => entertainment.value?.grantsToday ?? {})
const spendsToday = computed(() => entertainment.value?.spendsToday ?? [])
const balance = computed(() => entertainment.value?.balance ?? 0)

const extendPreviewMs = computed(() => {
  const amount = Number(String(extendInput.value).trim())
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return extraMsForYuan(extendCategory.value, amount)
})

function formatYuan(value: number) {
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function formatMinutes(ms: number) {
  const minutes = Math.round((ms / 60000) * 10) / 10
  return `${minutes} 分钟`
}

function isOn(id: EntertainmentCategory) {
  return activeTimer.value?.category === id
}

function ringProgress(remaining: number, limit: number) {
  if (limit <= 0) return 1
  return Math.min(1, Math.max(0, 1 - remaining / limit))
}

function ringVariant(id: EntertainmentCategory, remaining: number) {
  if (remaining <= 0) return 'alert'
  if (isOn(id) && remaining <= ENTERTAINMENT_WARN_MS) return 'alert'
  return 'fun'
}

function hintText(id: EntertainmentCategory, remaining: number, bought: number) {
  if (remaining <= 0) return '时间已用完，可用娱乐金额加时'
  if (isOn(id) && remaining <= ENTERTAINMENT_WARN_MS) return '还剩不到 3 分钟'
  if (isOn(id)) return '倒计时进行中'
  if (bought > 0) return `含加时 ${formatMinutes(bought)}`
  return '倒计时未开始'
}

async function handleOpen(id: EntertainmentCategory, remaining: number) {
  if (isOn(id) || remaining <= 0) return
  await handleStartTimer(id)
}

async function handleClose(id: EntertainmentCategory) {
  if (!isOn(id)) return
  await handleStopTimer()
}

function openSpend() {
  spendInput.value = ''
  spendError.value = ''
  showSpendModal.value = true
}

function openExtend(id: EntertainmentCategory) {
  extendCategory.value = id
  extendInput.value = '1'
  extendError.value = ''
  showExtendModal.value = true
}

async function confirmSpend() {
  const amount = Number(String(spendInput.value).trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    spendError.value = '请填写大于 0 的扣除金额'
    return
  }
  if (amount > balance.value + 1e-9) {
    spendError.value = '娱乐金额不足'
    return
  }
  try {
    spendError.value = ''
    await handleSpendEntertainment(amount)
    showSpendModal.value = false
  } catch {
    spendError.value = error.value || '扣除失败'
  }
}

async function confirmExtend() {
  const amount = Number(String(extendInput.value).trim())
  if (!Number.isFinite(amount) || amount <= 0) {
    extendError.value = '请填写大于 0 的加时金额'
    return
  }
  if (amount > balance.value + 1e-9) {
    extendError.value = '娱乐金额不足'
    return
  }
  try {
    extendError.value = ''
    await handleExtendEntertainment(extendCategory.value, amount)
    showExtendModal.value = false
  } catch {
    extendError.value = error.value || '加时失败'
  }
}

function spendLabel(item: { kind?: string; note?: string; amount: number; extraMs?: number; category?: string }) {
  if (item.kind === 'extend') {
    return item.note ? `${item.note}（-${formatYuan(item.amount)} 元）` : `加时 -${formatYuan(item.amount)} 元`
  }
  return `消费扣除 -${formatYuan(item.amount)} 元`
}
</script>

<template>
  <div class="page fun-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section v-for="item in items" :key="item.id" class="card timer-card">
      <p class="timer-card__mode">{{ item.title }}</p>
      <TimerRing
        :progress="ringProgress(item.remaining, item.limit)"
        :time="formatDuration(item.remaining)"
        :hint="hintText(item.id, item.remaining, item.bought)"
        :variant="ringVariant(item.id, item.remaining)"
      />
      <p class="timer-card__meta">
        {{ item.baseText }} · {{ item.rateText }}
        <span v-if="item.bought"> · 今日已加 {{ formatMinutes(item.bought) }}</span>
      </p>
      <div class="timer-card__actions">
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="loading || isOn(item.id) || item.remaining <= 0"
          @click="handleOpen(item.id, item.remaining)"
        >
          开启
        </button>
        <button class="btn btn--danger" type="button" :disabled="loading || !isOn(item.id)" @click="handleClose(item.id)">
          暂停
        </button>
        <button class="btn btn--primary" type="button" :disabled="loading || balance <= 0" @click="openExtend(item.id)">
          加时
        </button>
      </div>
    </section>

    <section class="card money-card">
      <div class="money-card__head">
        <div>
          <h3 class="money-card__title">娱乐金额</h3>
          <p class="money-card__hint">存在当前账号云端。视频 1 元 = 3 分钟，游戏 1 元 = 1.5 分钟。</p>
        </div>
        <strong class="money-card__value">{{ formatYuan(balance) }} 元</strong>
      </div>
      <button class="btn btn--primary btn--large money-card__action" type="button" :disabled="loading" @click="openSpend">
        消费扣除
      </button>
      <ul class="grant-list">
        <li :class="{ 'grant-list__item--done': grants.daily }">每天固定 +5 元{{ grants.daily ? '（今日已到账）' : '' }}</li>
        <li :class="{ 'grant-list__item--done': grants.work }">工作满 1 小时 +1 元</li>
        <li :class="{ 'grant-list__item--done': grants.study }">学习满 1 小时 +2.5 元</li>
        <li :class="{ 'grant-list__item--done': grants.commute }">交通出行满 1 小时 +1 元</li>
        <li :class="{ 'grant-list__item--done': grants.social }">应酬出行满 1 小时 +1 元</li>
        <li :class="{ 'grant-list__item--done': grants.housework }">做饭家务满 1 小时 +2 元</li>
      </ul>
      <div v-if="spendsToday.length" class="spend-list">
        <h4>今日扣除</h4>
        <p v-for="item in spendsToday" :key="item.id">{{ spendLabel(item) }}</p>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showSpendModal" class="modal-mask" @click.self="showSpendModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">消费扣除</h3>
          <p class="modal-panel__hint">当前余额 {{ formatYuan(balance) }} 元，扣除后会立刻写到云端。</p>
          <label class="field">
            <span class="field__label">扣除金额（元）</span>
            <input
              v-model="spendInput"
              class="field__input"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              placeholder="例如 3.5"
              @keydown.enter.prevent="confirmSpend"
            />
          </label>
          <p v-if="spendError" class="form-error">{{ spendError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" :disabled="loading" @click="confirmSpend">
            确定扣除
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showSpendModal = false">
            取消
          </button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showExtendModal" class="modal-mask" @click.self="showExtendModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">{{ extendCategory === 'video' ? '视频时间加时' : '游戏时间加时' }}</h3>
          <p class="modal-panel__hint">
            当前余额 {{ formatYuan(balance) }} 元。{{
              extendCategory === 'video' ? `1 元 = ${formatMinutes(VIDEO_MS_PER_YUAN)}` : `1 元 = ${formatMinutes(GAME_MS_PER_YUAN)}`
            }}。
          </p>
          <label class="field">
            <span class="field__label">花费金额（元）</span>
            <input
              v-model="extendInput"
              class="field__input"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              placeholder="例如 1"
              @keydown.enter.prevent="confirmExtend"
            />
          </label>
          <p v-if="extendPreviewMs" class="modal-panel__preview">将增加 {{ formatMinutes(extendPreviewMs) }}</p>
          <p v-if="extendError" class="form-error">{{ extendError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" :disabled="loading" @click="confirmExtend">
            确定加时
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showExtendModal = false">
            取消
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fun-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 16px 16px;
}

.timer-card__mode {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
}

.timer-card__meta {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  text-align: center;
}

.timer-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
}

.money-card {
  padding: 16px;
}

.money-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.money-card__title {
  margin: 0 0 4px;
  font-size: 15px;
}

.money-card__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.money-card__value {
  flex-shrink: 0;
  font-size: 22px;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.money-card__action {
  width: 100%;
  margin-top: 14px;
}

.grant-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.grant-list__item--done {
  color: var(--color-primary);
}

.spend-list {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.spend-list h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.spend-list p {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--color-danger);
}

.modal-panel__preview {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
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
