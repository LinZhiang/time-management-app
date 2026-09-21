<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, login, setToken } from '../api/client'
import { usePwaInstall } from '../utils/pwaInstall'

const router = useRouter()
const username = ref('admin')
const password = ref('')
const submitting = ref(false)
const loginError = ref('')
const installLoading = ref(false)

const {
  canPromptInstall,
  installUiStatus,
  installStatusHint,
  manualInstallSteps,
  browserInstallInfo,
  refreshInstalledState,
  promptPwaInstall,
} = usePwaInstall()

refreshInstalledState()

async function handleLogin() {
  loginError.value = ''
  submitting.value = true
  try {
    const result = await login(username.value.trim(), password.value)
    setToken(result.token)
    await router.replace('/stats')
  } catch (error) {
    loginError.value = error instanceof ApiError ? error.message : '登录失败，请检查网络'
  } finally {
    submitting.value = false
  }
}

async function handleInstall() {
  if (!canPromptInstall.value || installLoading.value) return
  installLoading.value = true
  try {
    await promptPwaInstall()
  } finally {
    installLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <header class="login-hero">
      <img class="login-hero__icon" src="/app-icon.svg" alt="" />
      <h1 class="login-hero__title">时间管理</h1>
      <p class="login-hero__desc">先登录，再开始记录今天的时间</p>
    </header>

    <section class="card login-card">
      <label class="field">
        <span class="field__label">账号</span>
        <input v-model="username" class="field__input" type="text" autocomplete="username" />
      </label>
      <label class="field">
        <span class="field__label">密码</span>
        <input
          v-model="password"
          class="field__input"
          type="password"
          autocomplete="current-password"
          @keyup.enter="handleLogin"
        />
      </label>
      <p v-if="loginError" class="form-error">{{ loginError }}</p>
      <button class="btn btn--primary btn--large login-card__submit" type="button" :disabled="submitting" @click="handleLogin">
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </section>

    <section class="card install-card">
      <h2 class="install-card__title">安装到手机</h2>
      <p class="install-card__desc">安装到主屏幕后，可像 App 一样全屏使用，登录状态会保留在本机。</p>

      <div
        class="install-status"
        :class="{
          'install-status--ok': installUiStatus === 'installed',
          'install-status--ready': installUiStatus === 'ready',
          'install-status--wait': installUiStatus === 'manual' || installUiStatus === 'preparing',
          'install-status--error': installUiStatus === 'error',
        }"
      >
        <p class="install-status__title">
          {{
            installUiStatus === 'installed'
              ? '已安装'
              : installUiStatus === 'ready'
                ? '可以安装'
                : installUiStatus === 'manual'
                  ? '请手动添加'
                  : installUiStatus === 'error'
                    ? '准备失败'
                    : '准备中'
          }}
        </p>
        <p class="install-status__text">{{ installStatusHint }}</p>
      </div>

      <button
        v-if="installUiStatus === 'ready'"
        class="btn btn--primary btn--large"
        type="button"
        :disabled="installLoading"
        @click="handleInstall"
      >
        {{ installLoading ? '处理中…' : '安装到手机' }}
      </button>

      <ol v-if="installUiStatus === 'manual'" class="install-steps">
        <li v-for="(step, index) in manualInstallSteps" :key="index">{{ step }}</li>
      </ol>

      <p v-if="installUiStatus === 'manual' && browserInstallInfo.isHuaweiBrowser" class="install-tip">
        若菜单里没有「添加到主屏幕」，请用 <strong>Chrome 浏览器</strong> 打开本页后再试。
      </p>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: calc(24px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.login-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 12px 8px;
  text-align: center;
}

.login-hero__icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
}

.login-hero__title {
  margin: 14px 0 6px;
  font-size: 24px;
  color: var(--color-primary);
}

.login-hero__desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.login-card,
.install-card {
  padding: 20px 16px;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-card__submit,
.install-card .btn--large {
  width: 100%;
}

.install-card__title {
  margin: 0 0 8px;
  font-size: 16px;
}

.install-card__desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.install-status {
  padding: 14px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.install-status--ok,
.install-status--ready {
  background: rgba(26, 107, 92, 0.08);
  border: 1px solid rgba(26, 107, 92, 0.2);
}

.install-status--wait {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.install-status--error {
  background: rgba(198, 40, 40, 0.06);
  border: 1px solid rgba(198, 40, 40, 0.2);
}

.install-status__title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.install-status__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.install-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.8;
}

.install-steps li + li {
  margin-top: 8px;
}

.install-tip {
  margin: 14px 0 0;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  background: rgba(255, 193, 7, 0.1);
  border-radius: var(--radius-md);
}
</style>
