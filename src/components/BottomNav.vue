<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/stats', label: '工作统计', icon: 'stats' },
  { path: '/time', label: '时间管理', icon: 'time' },
  { path: '/pomodoro', label: '番茄学习', icon: 'pomodoro' },
  { path: '/exercise', label: '运动管理', icon: 'exercise' },
  { path: '/plans', label: '计划安排', icon: 'plans' },
  { path: '/logs', label: '查看日志', icon: 'logs' },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <nav class="bottom-nav">
    <div class="bottom-nav__inner">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': isActive(tab.path) }"
      >
        <span class="bottom-nav__icon" :data-icon="tab.icon" aria-hidden="true" />
        <span class="bottom-nav__label">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
