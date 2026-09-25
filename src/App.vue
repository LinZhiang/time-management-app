<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { setToken } from './api/client'
import { setupAppState, teardownAppState } from './composables/useAppState'

const route = useRoute()
const router = useRouter()
const isLogin = computed(() => route.path === '/login')
const pageTitle = computed(() => (route.meta.title as string) ?? '时间管理')

function handleLogout() {
  setToken(null)
  teardownAppState()
  void router.replace('/login')
}

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
      <div class="app-header__inner">
        <h1 class="app-title">{{ pageTitle }}</h1>
        <button class="app-logout" type="button" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <KeepAlive include="TimeManageView,PomodoroView,ExerciseView,PlanView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <BottomNav />
  </div>
</template>
