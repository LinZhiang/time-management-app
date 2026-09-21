import { createRouter, createWebHistory } from 'vue-router'
import { fetchSession, getToken } from '../api/client'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/',
      redirect: '/stats',
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
      meta: { title: '工作统计' },
    },
    {
      path: '/time',
      name: 'time',
      component: () => import('../views/TimeManageView.vue'),
      meta: { title: '时间管理' },
    },
    {
      path: '/pomodoro',
      name: 'pomodoro',
      component: () => import('../views/PomodoroView.vue'),
      meta: { title: '番茄学习' },
    },
    {
      path: '/exercise',
      name: 'exercise',
      component: () => import('../views/ExerciseView.vue'),
      meta: { title: '运动管理' },
    },
    {
      path: '/plans',
      name: 'plans',
      component: () => import('../views/PlanView.vue'),
      meta: { title: '计划安排' },
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogView.vue'),
      meta: { title: '查看日志' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) {
    if (getToken() && to.path === '/login') {
      try {
        await fetchSession()
        return '/stats'
      } catch {
        return true
      }
    }
    return true
  }

  if (!getToken()) return '/login'
  try {
    await fetchSession()
    return true
  } catch {
    return '/login'
  }
})

export default router
