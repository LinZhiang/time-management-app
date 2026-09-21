import { spawnSync } from 'node:child_process'

const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN
if (!token) {
  process.exit(0)
}

const result = spawnSync(
  'npx',
  ['wrangler', 'pages', 'deploy', 'dist', '--project-name=time-management-app', '--commit-dirty=true'],
  { stdio: 'inherit', shell: true, env: process.env },
)

if (result.status !== 0) {
  console.warn('Cloudflare Pages 部署未成功，Worker 部署仍会继续。请用 https://time-management-app.pages.dev 检查。')
}
