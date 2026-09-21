import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const projectName = 'taihui-time'
const inCi = Boolean(
  process.env.CI ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_PAGES ||
    process.env.WORKERS_CI,
)

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

function deployPages() {
  const result = spawnSync(
    'npx',
    ['wrangler', 'pages', 'deploy', 'dist', '--project-name', projectName, '--commit-dirty=true'],
    { stdio: 'inherit', shell: true, env: process.env },
  )
  if (result.status !== 0) {
    throw new Error('wrangler pages deploy 失败')
  }
}

try {
  ensureDist()
  deployPages()
  console.log(`Pages 已部署：https://${projectName}.pages.dev`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  if (inCi) process.exit(1)
  console.warn('本地 Pages 部署未完成，稍后会随 Cloudflare 构建再试')
  process.exit(0)
}
