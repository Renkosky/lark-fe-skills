#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = process.argv[2] || ''
const feProjectPaths = process.argv[3] || ''
const outputDir = process.argv[4] || 'docs/frontend-tasks'
const skillDir = resolve(dirname(new URL(import.meta.url).pathname), '..')
const registryDir = join(skillDir, 'config')
const registryFile = join(registryDir, 'repos.json')

function die(message, code = 1) {
  console.error(message)
  process.exit(code)
}

function shellQuote(value) {
  const text = String(value)
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(text)) return text
  return `'${text.replace(/'/g, `'\\''`)}'`
}

function commandExists(command) {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0
}

function requireLarkCli() {
  if (commandExists('lark-cli')) return
  die(`Error: lark-cli is required but was not found in PATH.

Please install and configure Lark CLI before using prd-fe-task:

  npm install -g @larksuite/cli
  lark-cli config init
  lark-cli auth login --recommend

Official lark-cli documentation:
  https://github.com/larksuite/cli/tree/main

If your organization uses a different installation method, install lark-cli first,
then rerun this command.`, 127)
}

function ensureLocalConfigGitignore(root) {
  const gitignoreFile = join(root, '.gitignore')
  const ignorePath = '.lark-fe-task/'
  const existing = existsSync(gitignoreFile) ? readFileSync(gitignoreFile, 'utf8') : ''
  if (existing.split(/\r?\n/).includes(ignorePath)) return
  const prefix = existing && !existing.endsWith('\n') ? '\n\n' : existing ? '\n' : ''
  writeFileSync(gitignoreFile, `${existing}${prefix}# prd-fe-task local config\n${ignorePath}\n`)
}

if (!repoRoot || !feProjectPaths) {
  die('Usage: config.sh <repo-root> <fe-project-paths-comma-separated> [output-dir]', 2)
}

requireLarkCli()

if (!existsSync(repoRoot) || !statSync(repoRoot).isDirectory()) die(`Repo root does not exist: ${repoRoot}`)
const fePathArray = feProjectPaths.split(',')
for (const fePath of fePathArray) {
  if (!fePath) die('FE project path list contains an empty entry')
  if (!existsSync(join(repoRoot, fePath)) || !statSync(join(repoRoot, fePath)).isDirectory()) {
    die(`FE project path does not exist: ${join(repoRoot, fePath)}`)
  }
}

const configDir = join(repoRoot, '.lark-fe-task')
const configFile = join(configDir, 'config.env')
mkdirSync(configDir, { recursive: true })
mkdirSync(registryDir, { recursive: true })

writeFileSync(configFile, [
  `REPO_ROOT=${shellQuote(repoRoot)}`,
  `FE_PROJECT_PATHS=${shellQuote(feProjectPaths)}`,
  `OUTPUT_DIR=${shellQuote(outputDir)}`,
  '',
].join('\n'))
ensureLocalConfigGitignore(repoRoot)

let data = { version: 1, repos: [] }
if (existsSync(registryFile) && readFileSync(registryFile, 'utf8').trim()) {
  data = JSON.parse(readFileSync(registryFile, 'utf8'))
}
data.version ||= 1
data.repos ||= []
const entry = {
  repoRoot,
  feProjectPaths: fePathArray,
  outputDir,
  updatedAt: new Date().toISOString(),
}
const index = data.repos.findIndex((repo) => repo.repoRoot === repoRoot)
if (index >= 0) data.repos[index] = entry
else data.repos.push(entry)
writeFileSync(registryFile, `${JSON.stringify(data, null, 2)}\n`)

console.log(`Configured prd-fe-task.
CONFIG_FILE=${configFile}
REGISTRY_FILE=${registryFile}
REPO_ROOT=${repoRoot}
FE_PROJECT_PATHS=${feProjectPaths}
OUTPUT_DIR=${outputDir}`)
