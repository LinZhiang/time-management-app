import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const projectName = 'taihui-time'

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    cwd: root,
  })
}

function ensureDist() {
  if (existsSync(join(root, 'dist', 'index.html'))) return
  const built = run('npx', ['vite', 'build'])
  if (built.status !== 0) {
    throw new Error('构建前端失败')
  }
}

function insideWorkerBuild() {
  const command = process.env.WRANGLER_COMMAND
  return (
    command === 'deploy' ||
    command === 'versions upload' ||
    Boolean(process.env.WORKERS_CI || process.env.CF_PAGES)
  )
}

function deployPages() {
  const result = run('npx', [
    'wrangler',
    'pages',
    'deploy',
    'dist',
    '--project-name',
    projectName,
    '--commit-dirty=true',
    '--config',
    'wrangler.pages.toml',
  ])
  if (result.status !== 0) {
    throw new Error('wrangler pages deploy 失败')
  }
}

try {
  ensureDist()
  if (insideWorkerBuild()) {
    console.log('Worker 构建只需前端产物，跳过 Pages 部署')
    process.exit(0)
  }
  deployPages()
  console.log(`Pages 已部署：https://${projectName}.pages.dev`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
