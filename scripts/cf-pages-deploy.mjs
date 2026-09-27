import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const projectName = 'taihui-time'
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '4a53ad71b3e0c066af70d9fad9c8f589'
const kvTitle = 'time-management-store'
const wranglerPath = new URL('../wrangler.toml', import.meta.url)
const inCi = Boolean(
  process.env.CI ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_PAGES ||
    process.env.WORKERS_CI,
)

function wranglerToken() {
  if (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN
  }
  try {
    const text = readFileSync(join(homedir(), 'AppData/Roaming/xdg.config/.wrangler/config/default.toml'), 'utf8')
    return text.match(/oauth_token = "([^"]+)"/)?.[1] || ''
  } catch {
    return ''
  }
}

function pagesConfig() {
  return `name = "taihui-time"
compatibility_date = "2025-09-21"
pages_build_output_dir = "./dist"

[[services]]
binding = "API"
service = "time-management-app"
`
}

function ensureDist() {
  if (existsSync(new URL('../dist/index.html', import.meta.url))) return
  const built = spawnSync('npx', ['vite', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (built.status !== 0) {
    throw new Error('构建前端失败')
  }
}

function runWrangler(args) {
  return spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })
}

function parseJson(text) {
  const trimmed = (text || '').trim()
  const start = Math.min(
    ...['[', '{'].map((item) => {
      const index = trimmed.indexOf(item)
      return index === -1 ? Number.POSITIVE_INFINITY : index
    }),
  )
  if (!Number.isFinite(start)) return null
  try {
    return JSON.parse(trimmed.slice(start))
  } catch {
    return null
  }
}

function ensureKvId() {
  const listed = runWrangler(['kv', 'namespace', 'list'])
  const namespaces = parseJson(`${listed.stdout || ''}\n${listed.stderr || ''}`) || []
  const found = Array.isArray(namespaces) ? namespaces.find((item) => item.title === kvTitle) : null
  if (found?.id) return found.id

  const created = runWrangler(['kv', 'namespace', 'create', kvTitle])
  const output = `${created.stdout || ''}\n${created.stderr || ''}`
  const createdJson = parseJson(output)
  if (createdJson?.id) return createdJson.id
  const match = output.match(/id\s*=\s*"([^"]+)"/)
  if (match?.[1]) return match[1]
  return '674ce040b97944c48b1af76c9382ab08'
}

async function bindPages(kvId, token) {
  if (!token) return
  const currentRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const current = await currentRes.json()
  const configs = current.result?.deployment_configs || {}
  const body = {
    deployment_configs: {
      preview: {
        ...(configs.preview || {}),
        service_bindings: {
          ...(configs.preview?.service_bindings || {}),
          API: { service: 'time-management-app' },
        },
      },
      production: {
        ...(configs.production || {}),
        service_bindings: {
          ...(configs.production?.service_bindings || {}),
          API: { service: 'time-management-app' },
        },
      },
    },
  }
  const patched = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  const data = await patched.json()
  if (!data.success) {
    console.warn('绑定 Pages 存储未完全成功：', JSON.stringify(data.errors || data))
  }
}

function deployPages() {
  const original = readFileSync(wranglerPath, 'utf8')
  writeFileSync(wranglerPath, pagesConfig())
  try {
    const result = spawnSync(
      'npx',
      ['wrangler', 'pages', 'deploy', 'dist', '--project-name', projectName, '--commit-dirty=true'],
      { stdio: 'inherit', shell: true, env: process.env },
    )
    if (result.status !== 0) {
      throw new Error('wrangler pages deploy 失败')
    }
  } finally {
    writeFileSync(wranglerPath, original)
  }
}

try {
  ensureDist()
  const kvId = ensureKvId()
  await bindPages(kvId, wranglerToken())
  deployPages()
  console.log(`Pages 已部署：https://${projectName}.pages.dev`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  if (inCi) process.exit(1)
  console.warn('本地 Pages 部署未完成，Cloudflare 构建时会再试')
  process.exit(0)
}
