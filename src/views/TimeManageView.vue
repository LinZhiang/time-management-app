<script setup lang="ts">
defineOptions({ name: 'TimeManageView' })

import { ref } from 'vue'
import { useAppState } from '../composables/useAppState'
import { formatDuration } from '../../shared/date.ts'
import { CATEGORY_LABELS, TIME_CATEGORIES, type TimeCategory } from '../../shared/types.ts'

const {
  loading,
  error,
  today,
  activeTimer,
  categoryDisplayMs,
  handleStartTimer,
  handleStopTimer,
} = useAppState()

const showOtherModal = ref(false)
const otherNote = ref('')
const otherError = ref('')

function isRunning(category: TimeCategory) {
  return activeTimer.value?.category === category
}

async function handleOpen(category: TimeCategory) {
  if (isRunning(category)) return
  if (category === 'other') {
    otherNote.value = ''
    otherError.value = ''
    showOtherModal.value = true
    return
  }
  await handleStartTimer(category)
}

async function confirmOther() {
  const note = otherNote.value.trim()
  if (!note) {
    otherError.value = '请写明这段其他时间具体是什么'
    return
  }
  await handleStartTimer('other', note)
  showOtherModal.value = false
}

async function handleClose(category: TimeCategory) {
  if (!isRunning(category)) return
  await handleStopTimer()
}

function runningNote(category: TimeCategory) {
  if (category !== 'other' || !isRunning('other')) return ''
  return activeTimer.value?.otherNote ? `（${activeTimer.value.otherNote}）` : ''
}
</script>

<template>
  <div class="page time-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card list-card">
      <article v-for="category in TIME_CATEGORIES" :key="category" class="time-item">
        <div class="time-item__info">
          <h3 class="time-item__title">
            {{ CATEGORY_LABELS[category] }}
            <span v-if="runningNote(category)" class="time-item__note">{{ runningNote(category) }}</span>
          </h3>
          <p class="time-item__time" :class="{ 'time-item__time--active': isRunning(category) }">
            {{ formatDuration(categoryDisplayMs(category)) }}
          </p>
        </div>
        <div class="time-item__actions">
          <button
            class="btn btn--ghost btn--small"
            type="button"
            :disabled="loading || isRunning(category)"
            @click="handleOpen(category)"
          >
            开启
          </button>
          <button
            class="btn btn--danger btn--small"
            type="button"
            :disabled="loading || !isRunning(category)"
            @click="handleClose(category)"
          >
            关闭
          </button>
        </div>
      </article>
    </section>

    <section v-if="today?.otherDetails.length" class="card detail-card">
      <h3 class="detail-card__title">今日其他时间明细</h3>
      <ul class="detail-card__list">
        <li v-for="item in today.otherDetails" :key="item.note" class="detail-card__item">
          <span>{{ item.note }}</span>
          <strong>{{ formatDuration(item.ms) }}</strong>
        </li>
      </ul>
    </section>

    <Teleport to="body">
      <div v-if="showOtherModal" class="modal-mask" @click.self="showOtherModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">其他时间</h3>
          <p class="modal-panel__hint">请写明这段时间具体是做什么，确认后开始计时。</p>
          <label class="field">
            <span class="field__label">具体内容</span>
            <input
              v-model="otherNote"
              class="field__input"
              type="text"
              maxlength="40"
              placeholder="例如：整理资料、排队办事"
              @keyup.enter="confirmOther"
            />
          </label>
          <p v-if="otherError" class="form-error">{{ otherError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" @click="confirmOther">
            开始计时
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showOtherModal = false">
            取消
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.time-page {
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

.time-item__note {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
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

.time-item__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-card {
  padding: 16px;
}

.detail-card__title {
  margin: 0 0 10px;
  font-size: 14px;
}

.detail-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-card__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
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
