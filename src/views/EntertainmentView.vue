<script setup lang="ts">
defineOptions({ name: 'EntertainmentView' })

import { computed, ref } from 'vue'
import { useAppState } from '../composables/useAppState'
import { formatDuration } from '../../shared/date.ts'
import { GAME_LIMIT_MS, VIDEO_LIMIT_MS, type EntertainmentCategory } from '../../shared/types.ts'

const {
  loading,
  error,
  activeTimer,
  entertainment,
  categoryDisplayMs,
  handleStartTimer,
  handleStopTimer,
  handleSpendEntertainment,
} = useAppState()

const showSpendModal = ref(false)
const spendInput = ref('')
const spendError = ref('')

const items = computed(() => {
  const videoUsed = Math.min(VIDEO_LIMIT_MS, categoryDisplayMs('video'))
  const gameUsed = Math.min(GAME_LIMIT_MS, categoryDisplayMs('game'))
  return [
    {
      id: 'video' as const,
      title: '视频时间',
      used: videoUsed,
      limit: VIDEO_LIMIT_MS,
      limitText: '每天上限 1 小时',
    },
    {
      id: 'game' as const,
      title: '游戏时间',
      used: gameUsed,
      limit: GAME_LIMIT_MS,
      limitText: '每天上限 30 分钟',
    },
  ]
})

const grants = computed(() => entertainment.value?.grantsToday ?? {})
const spendsToday = computed(() => entertainment.value?.spendsToday ?? [])
const balance = computed(() => entertainment.value?.balance ?? 0)

function formatYuan(value: number) {
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function isOn(id: EntertainmentCategory) {
  return activeTimer.value?.category === id
}

async function handleOpen(id: EntertainmentCategory, used: number, limit: number) {
  if (isOn(id) || used >= limit) return
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
</script>

<template>
  <div class="page fun-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card list-card">
      <article v-for="item in items" :key="item.id" class="time-item">
        <div class="time-item__info">
          <h3 class="time-item__title">{{ item.title }}</h3>
          <p class="time-item__time" :class="{ 'time-item__time--active': isOn(item.id) }">
            {{ formatDuration(item.used) }}
            <span class="time-item__limit">/ {{ formatDuration(item.limit) }}</span>
          </p>
          <p class="time-item__hint">{{ item.limitText }}</p>
        </div>
        <div class="time-item__actions">
          <button
            class="btn btn--ghost btn--small"
            type="button"
            :disabled="loading || isOn(item.id) || item.used >= item.limit"
            @click="handleOpen(item.id, item.used, item.limit)"
          >
            开启
          </button>
          <button
            class="btn btn--danger btn--small"
            type="button"
            :disabled="loading || !isOn(item.id)"
            @click="handleClose(item.id)"
          >
            暂停
          </button>
        </div>
      </article>
    </section>

    <section class="card money-card">
      <div class="money-card__head">
        <div>
          <h3 class="money-card__title">娱乐金额</h3>
          <p class="money-card__hint">存在当前账号云端，每天打开都会按规则结算。</p>
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
        <p v-for="item in spendsToday" :key="item.id">-{{ formatYuan(item.amount) }} 元</p>
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
  </div>
</template>

<style scoped>
.fun-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.list-card {
  overflow: hidden;
}

.time-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.time-item:last-child {
  border-bottom: none;
}

.time-item__info {
  min-width: 0;
  flex: 1;
}

.time-item__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.time-item__time {
  margin: 0;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

.time-item__time--active {
  color: var(--color-primary);
  font-weight: 700;
}

.time-item__limit {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.time-item__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.time-item__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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

.modal-submit {
  width: 100%;
  margin-top: 14px;
}

.modal-cancel {
  width: 100%;
  margin-top: 8px;
}
</style>
