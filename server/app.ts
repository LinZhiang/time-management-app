import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { dateKey, monthEnd, monthStart } from '../shared/date.ts'
import type { AppStore, PomodoroSettings, TimeCategory } from '../shared/types.ts'
import {
  ApiError,
  createLongTermPeriod,
  createPlan,
  deleteLongTermPeriod,
  enterPomodoroBuffer,
  enterPomodoroRest,
  exitPomodoro,
  getLongTerm,
  getPlan,
  liveState,
  listLogs,
  listPlans,
  saveLongTermOverview,
  startExercise,
  startPomodoro,
  startTimer,
  stopExercise,
  stopTimer,
  sumRange,
  updateLongTermPeriod,
  updatePomodoroSettings,
} from './logic.ts'
import type { StoreRunner } from './store-state.ts'

const USERNAME = 'admin'
const PASSWORD = 'Taihui123'

function createToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return [...bytes].map((item) => item.toString(16).padStart(2, '0')).join('')
}

function bearer(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

function jsonError(error: unknown): { status: 400 | 401 | 404 | 500; body: { error: string } } {
  if (error instanceof ApiError) {
    const status = error.status === 401 || error.status === 404 || error.status === 400 ? error.status : 500
    return { status, body: { error: error.message } }
  }
  console.error(error)
  return { status: 500, body: { error: '服务器异常，请稍后重试' } }
}

export function createApp(withStore: StoreRunner) {
  const app = new Hono()

  app.use(
    '/api/*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )

  async function requireAuth(c: { req: { header: (name: string) => string | undefined } }) {
    const token = bearer(c.req.header('Authorization'))
    const valid = await withStore((store: AppStore) =>
      Boolean(token && store.authToken && token === store.authToken),
    )
    if (!valid) throw new ApiError(401, '请先登录')
  }

  app.post('/api/login', async (c) => {
    try {
      const body = await c.req.json<{ username?: string; password?: string }>()
      if (body.username !== USERNAME || body.password !== PASSWORD) {
        return c.json({ error: '账号或密码错误' }, 401)
      }
      const token = await withStore((store) => {
        if (!store.authToken) store.authToken = createToken()
        return store.authToken
      })
      return c.json({ token, username: USERNAME })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/session', async (c) => {
    try {
      await requireAuth(c)
      return c.json({ ok: true, username: USERNAME })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/state', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => liveState(store))
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/timer/start', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ category?: TimeCategory; otherNote?: string }>()
      if (!body.category) return c.json({ error: '缺少时间类型' }, 400)
      const state = await withStore((store) => {
        startTimer(store, body.category as TimeCategory, body.otherNote)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/timer/stop', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        stopTimer(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/pomodoro/settings', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<PomodoroSettings>()
      const state = await withStore((store) => {
        updatePomodoroSettings(store, body)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/pomodoro/start', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        startPomodoro(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/pomodoro/buffer', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        enterPomodoroBuffer(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/pomodoro/rest', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        enterPomodoroRest(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/pomodoro/exit', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        exitPomodoro(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/exercise/start', async (c) => {
    try {
      await requireAuth(c)
      const state = await withStore((store) => {
        startExercise(store)
        return liveState(store)
      })
      return c.json(state)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/exercise/stop', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ calories?: number }>().catch(() => ({ calories: undefined }))
      const result = await withStore((store) => {
        const stopped = stopExercise(store, body.calories)
        return { ...liveState(store), ...stopped }
      })
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/stats', async (c) => {
    try {
      await requireAuth(c)
      const scope = c.req.query('scope') === 'month' ? 'month' : 'today'
      const today = dateKey()
      const from = scope === 'month' ? monthStart(today) : today
      const to = scope === 'month' ? monthEnd(today) : today
      const result = await withStore((store) => ({
        scope,
        from,
        to,
        ...sumRange(store, from, to),
      }))
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/logs', async (c) => {
    try {
      await requireAuth(c)
      const today = dateKey()
      const from = c.req.query('from') || monthStart(today)
      const to = c.req.query('to') || today
      const days = await withStore((store) => listLogs(store, from, to))
      return c.json({ from, to, days })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/plans', async (c) => {
    try {
      await requireAuth(c)
      const today = dateKey()
      const from = c.req.query('from') || monthStart(today)
      const to = c.req.query('to') || monthEnd(today)
      const plans = await withStore((store) => listPlans(store, from, to))
      return c.json({ from, to, plans })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/plans', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ title?: string; detail?: string }>()
      const plan = await withStore((store) => createPlan(store, body.title ?? '', body.detail ?? ''))
      return c.json({ plan })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/plans/:id', async (c) => {
    try {
      await requireAuth(c)
      const plan = await withStore((store) => getPlan(store, c.req.param('id')))
      return c.json({ plan })
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.get('/api/long-term', async (c) => {
    try {
      await requireAuth(c)
      const result = await withStore((store) => getLongTerm(store))
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/long-term/overview', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ title?: string; detail?: string }>()
      const result = await withStore((store) => {
        saveLongTermOverview(store, body.title ?? '', body.detail ?? '')
        return getLongTerm(store)
      })
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/long-term/periods', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ title?: string; detail?: string; startDate?: string; endDate?: string }>()
      const result = await withStore((store) => {
        createLongTermPeriod(store, body)
        return getLongTerm(store)
      })
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/long-term/periods/:id', async (c) => {
    try {
      await requireAuth(c)
      const body = await c.req.json<{ title?: string; detail?: string; startDate?: string; endDate?: string }>()
      const result = await withStore((store) => {
        updateLongTermPeriod(store, c.req.param('id'), body)
        return getLongTerm(store)
      })
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  app.post('/api/long-term/periods/:id/delete', async (c) => {
    try {
      await requireAuth(c)
      const result = await withStore((store) => {
        deleteLongTermPeriod(store, c.req.param('id'))
        return getLongTerm(store)
      })
      return c.json(result)
    } catch (error) {
      const { status, body } = jsonError(error)
      return c.json(body, status)
    }
  })

  return app
}
