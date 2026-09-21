import type { DayRecord, LiveState, Plan, PomodoroSettings, TimeCategory } from '../../shared/types.ts'

const TOKEN_KEY = 'tm-auth-token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(url, { ...options, headers })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (response.status === 401 && !url.includes('/api/login')) {
    setToken(null)
  }

  if (!response.ok) {
    throw new ApiError(response.status, data.error || '请求失败')
  }
  return data
}

export function login(username: string, password: string) {
  return request<{ token: string; username: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchSession() {
  return request<{ ok: boolean; username: string }>('/api/session')
}

export function fetchState() {
  return request<LiveState>('/api/state')
}

export function startTimer(category: TimeCategory, otherNote?: string) {
  return request<LiveState>('/api/timer/start', {
    method: 'POST',
    body: JSON.stringify({ category, otherNote }),
  })
}

export function stopTimer() {
  return request<LiveState>('/api/timer/stop', { method: 'POST', body: '{}' })
}

export function savePomodoroSettings(settings: PomodoroSettings) {
  return request<LiveState>('/api/pomodoro/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export function startPomodoro() {
  return request<LiveState>('/api/pomodoro/start', { method: 'POST', body: '{}' })
}

export function enterPomodoroRest() {
  return request<LiveState>('/api/pomodoro/rest', { method: 'POST', body: '{}' })
}

export function exitPomodoro() {
  return request<LiveState>('/api/pomodoro/exit', { method: 'POST', body: '{}' })
}

export function startExercise() {
  return request<LiveState>('/api/exercise/start', { method: 'POST', body: '{}' })
}

export function stopExercise(calories?: number) {
  return request<LiveState & { recorded: boolean; elapsedMs: number; calories: number }>(
    '/api/exercise/stop',
    {
      method: 'POST',
      body: JSON.stringify({ calories }),
    },
  )
}

export function fetchStats(scope: 'today' | 'month') {
  return request<{
    scope: string
    from: string
    to: string
    total: DayRecord
    days: DayRecord[]
  }>(`/api/stats?scope=${scope}`)
}

export function fetchLogs(from: string, to: string) {
  return request<{ from: string; to: string; days: DayRecord[] }>(
    `/api/logs?from=${from}&to=${to}`,
  )
}

export function fetchPlans(from: string, to: string) {
  return request<{ from: string; to: string; plans: Plan[] }>(`/api/plans?from=${from}&to=${to}`)
}

export function createPlan(title: string, detail: string) {
  return request<{ plan: Plan }>('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ title, detail }),
  })
}

export function fetchPlan(id: string) {
  return request<{ plan: Plan }>(`/api/plans/${id}`)
}
