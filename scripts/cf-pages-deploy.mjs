import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const projectName = 'taihui-time'
const wranglerPath = new URL('../wrangler.toml', import.meta.url)
const pagesConfig = `name = "taihui-time"
compatibility_date = "2025-09-21"
pages_build_output_dir = "./dist"

[[kv_namespaces]]
binding = "STORE"
id = "674ce040b97944c48b1af76c9382ab08"
`
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
  const original = readFileSync(wranglerPath, 'utf8')
  writeFileSync(wranglerPath, pagesConfig)
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
  deployPages()
  console.log(`Pages 已部署：https://${projectName}.pages.dev`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  if (inCi) process.exit(1)
  console.warn('本地 Pages 部署未完成，Cloudflare 构建时会再试')
  process.exit(0)
}
