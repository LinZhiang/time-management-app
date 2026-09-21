<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { setupAppState, teardownAppState } from './composables/useAppState'

const route = useRoute()
const isLogin = computed(() => route.path === '/login')
const pageTitle = computed(() => (route.meta.title as string) ?? '时间管理')

watch(
  isLogin,
  (login) => {
    if (login) teardownAppState()
    else void setupAppState()
  },
  { immediate: true },
)

onMounted(() => {
  if (!isLogin.value) void setupAppState()
})

onUnmounted(() => {
  teardownAppState()
})
</script>

<template>
  <RouterView v-if="isLogin" />

  <div v-else class="app-shell">
    <header class="app-header">
      <h1 class="app-title">{{ pageTitle }}</h1>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <KeepAlive include="TimeManageView,PomodoroView,ExerciseView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <BottomNav />
  </div>
</template>
