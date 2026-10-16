<script setup lang="ts">
defineOptions({ name: 'TimeManageView' })

import { computed, ref } from 'vue'
import { useAppState } from '../composables/useAppState'
import { formatDuration } from '../../shared/date.ts'
import { listVisibleTimeModules } from '../../shared/time-modules.ts'

const {
  loading,
  error,
  today,
  activeTimer,
  customModules,
  hiddenCategories,
  categoryDisplayMs,
  handleStartTimer,
  handleStopTimer,
  handleCreateTimeModule,
  handleDeleteTimeModule,
} = useAppState()

const showOtherModal = ref(false)
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const otherNote = ref('')
const otherError = ref('')
const newModuleTitle = ref('')
const addError = ref('')
const pendingDelete = ref<{ id: string; title: string } | null>(null)

const modules = computed(() => listVisibleTimeModules(customModules.value, hiddenCategories.value))

function isRunning(category: string) {
  return activeTimer.value?.category === category
}

async function handleOpen(category: string) {
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

async function handleClose(category: string) {
  if (!isRunning(category)) return
  await handleStopTimer()
}

function runningNote(category: string) {
  if (category !== 'other' || !isRunning('other')) return ''
  return activeTimer.value?.otherNote ? `（${activeTimer.value.otherNote}）` : ''
}

function askDelete(id: string, title: string) {
  pendingDelete.value = { id, title }
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  await handleDeleteTimeModule(pendingDelete.value.id)
  showDeleteModal.value = false
  pendingDelete.value = null
}

async function confirmAdd() {
  const title = newModuleTitle.value.trim()
  if (!title) {
    addError.value = '请填写时间模块名称'
    return
  }
  try {
    addError.value = ''
    await handleCreateTimeModule(title)
    showAddModal.value = false
    newModuleTitle.value = ''
  } catch {
    addError.value = error.value || '添加失败'
  }
}

function openAddModal() {
  newModuleTitle.value = ''
  addError.value = ''
  showAddModal.value = true
}
</script>

<template>
  <div class="page time-page">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card list-card">
      <article v-for="item in modules" :key="item.id" class="time-item">
        <div class="time-item__info">
          <h3 class="time-item__title">
            {{ item.title }}
            <span v-if="runningNote(item.id)" class="time-item__note">{{ runningNote(item.id) }}</span>
          </h3>
          <p class="time-item__time" :class="{ 'time-item__time--active': isRunning(item.id) }">
            {{ formatDuration(categoryDisplayMs(item.id)) }}
          </p>
        </div>
        <div class="time-item__actions">
          <button
            class="btn btn--ghost btn--small"
            type="button"
            :disabled="loading || isRunning(item.id)"
            @click="handleOpen(item.id)"
          >
            开启
          </button>
          <button
            class="btn btn--danger btn--small"
            type="button"
            :disabled="loading || !isRunning(item.id)"
            @click="handleClose(item.id)"
          >
            暂停
          </button>
          <button
            v-if="item.deletable"
            class="btn btn--small time-item__delete"
            type="button"
            :disabled="loading"
            @click="askDelete(item.id, item.title)"
          >
            删除
          </button>
        </div>
      </article>
      <button class="btn btn--ghost btn--large add-module" type="button" :disabled="loading" @click="openAddModal">
        新增时间模块
      </button>
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

      <div v-if="showAddModal" class="modal-mask" @click.self="showAddModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">新增时间模块</h3>
          <p class="modal-panel__hint">会保存在「其他时间」上面，之后都可以直接计时。</p>
          <label class="field">
            <span class="field__label">模块名称</span>
            <input
              v-model="newModuleTitle"
              class="field__input"
              type="text"
              maxlength="20"
              placeholder="例如：面试时间"
              @keyup.enter="confirmAdd"
            />
          </label>
          <p v-if="addError" class="form-error">{{ addError }}</p>
          <button class="btn btn--primary btn--large modal-submit" type="button" :disabled="loading" @click="confirmAdd">
            保存模块
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showAddModal = false">
            取消
          </button>
        </div>
      </div>

      <div v-if="showDeleteModal" class="modal-mask" @click.self="showDeleteModal = false">
        <div class="modal-panel card">
          <h3 class="modal-panel__title">删除 {{ pendingDelete?.title }}</h3>
          <p class="modal-panel__hint">删除后，这个模块已记录的时间会归入「其他时间」，工作统计里也不再单独展示。</p>
          <button class="btn btn--danger btn--large modal-submit" type="button" :disabled="loading" @click="confirmDelete">
            确定删除
          </button>
          <button class="btn btn--ghost btn--small modal-cancel" type="button" @click="showDeleteModal = false">
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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  max-width: 210px;
}

.time-item__delete {
  background: #f4f4f5;
  color: var(--color-text-secondary);
}

.add-module {
  width: calc(100% - 32px);
  margin: 12px 16px 16px;
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
