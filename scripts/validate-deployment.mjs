import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const configPath = join(repositoryRoot, 'deploy', 'nginx', 'restaurant.conf.template')
const read = (relativePath) => readFileSync(join(repositoryRoot, relativePath), 'utf8')
const config = read('deploy/nginx/restaurant.conf.template')
const deploymentReadme = read('deploy/README.md')

const checks = []
const check = (description, callback) => {
  callback()
  checks.push(description)
}

const locationBlock = (prefix) => {
  const start = config.indexOf(prefix)
  assert.notEqual(start, -1, `missing ${prefix}`)
  const open = config.indexOf('{', start)
  let depth = 0
  for (let index = open; index < config.length; index += 1) {
    if (config[index] === '{') depth += 1
    if (config[index] === '}') depth -= 1
    if (depth === 0) return config.slice(open + 1, index)
  }
  assert.fail(`unterminated ${prefix}`)
}

check('all deployment placeholders are documented exactly once in the replacement table', () => {
  const placeholders = [...new Set(config.match(/__[A-Z0-9_]+__/g) ?? [])].sort()
  assert.deepEqual(placeholders, [
    '__BACKEND_HOST__',
    '__BACKEND_PORT__',
    '__DOMAIN__',
    '__TLS_CERTIFICATE_PATH__',
    '__TLS_PRIVATE_KEY_PATH__',
    '__WEB_ROOT__',
  ])
  for (const placeholder of placeholders) {
    const tableRows = deploymentReadme
      .split('\n')
      .filter((line) => line.startsWith(`| \`${placeholder}\``))
    assert.equal(tableRows.length, 1, `${placeholder} must have one replacement-table row`)
  }
})

check('HTTP redirects all requests to the same host over HTTPS', () => {
  assert.match(config, /listen 80;/)
  assert.match(config, /return 301 https:\/\/\$host\$request_uri;/)
})

check('HTTPS serves the staged customer and admin SPAs from explicit paths', () => {
  assert.match(config, /listen 443 ssl http2;/)
  assert.match(config, /root __WEB_ROOT__;/)
  assert.match(locationBlock('location ^~ /admin/'), /try_files \$uri \$uri\/ \/admin\/index\.html;/)
  assert.match(locationBlock('location / {'), /try_files \$uri \$uri\/ \/index\.html;/)
  assert.match(locationBlock('location = /admin'), /return 308 \/admin\//)
})

check('/api/ strips its prefix before proxying to Spring Boot', () => {
  const api = locationBlock('location /api/')
  assert.match(api, /proxy_pass http:\/\/restaurant_backend\//)
  assert.doesNotMatch(api, /proxy_pass http:\/\/restaurant_backend;/)
  assert.match(api, /proxy_set_header X-Forwarded-Proto \$scheme;/)
})

check('/ws/ preserves its path and enables WebSocket upgrade', () => {
  const websocket = locationBlock('location /ws/')
  assert.match(websocket, /proxy_pass http:\/\/restaurant_backend;/)
  assert.doesNotMatch(websocket, /proxy_pass http:\/\/restaurant_backend\//)
  assert.match(websocket, /proxy_http_version 1\.1;/)
  assert.match(websocket, /proxy_set_header Upgrade \$http_upgrade;/)
  assert.match(websocket, /proxy_set_header Connection \$connection_upgrade;/)
  assert.match(websocket, /proxy_set_header X-Forwarded-Proto \$scheme;/)
})

check('the production kitchen WebSocket is same-origin and selects WSS on HTTPS', () => {
  const kitchen = read('admin/src/views/Kitchen.vue')
  assert.match(kitchen, /location\.protocol === ['"]https:['"] \? ['"]wss['"] : ['"]ws['"]/)
  assert.match(kitchen, /\$\{location\.host\}\/ws\/kitchen/)
})

const runBuild = (application, extraArguments = []) => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', 'build', '--', ...extraArguments], {
    cwd: join(repositoryRoot, application),
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    if (result.error) process.stderr.write(`${result.error.message}\n`)
    process.exit(result.status ?? 1)
  }
  process.stdout.write(result.stdout)
}

if (process.argv.includes('--build')) {
  runBuild('customer')
  runBuild('admin', ['--base=/admin/'])

  check('customer build uses root-relative static asset URLs', () => {
    const index = read('customer/dist/index.html')
    assert.match(index, /(?:src|href)="\/assets\//)
    assert.doesNotMatch(index, /(?:src|href)="\/admin\//)
  })

  check('admin build uses /admin/-relative static asset URLs', () => {
    const index = read('admin/dist/index.html')
    assert.match(index, /(?:src|href)="\/admin\/assets\//)
    assert.doesNotMatch(index, /(?:src|href)="\/assets\//)
  })
}

console.log(`Deployment validation passed (${checks.length} checks).`)
console.log(`Template: ${configPath}`)
