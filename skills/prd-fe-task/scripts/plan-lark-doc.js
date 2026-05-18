#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const docInput = process.argv[2] || ''
const repoRootArg = process.argv[3] || ''
const skillDir = resolve(dirname(new URL(import.meta.url).pathname), '..')
const registryFile = join(skillDir, 'config', 'repos.json')

let repoRoot = process.cwd()
let feProjectPaths = '<not-configured>'
let outputDir = 'docs/frontend-tasks'
let configStatus = 'missing'
let configSource = '<none>'

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    die(result.stderr || result.stdout || `Command failed: ${command} ${args.join(' ')}`, result.status || 1)
  }
  return result.stdout
}

function requireLarkCli() {
  if (process.env.PRD_FE_TASK_SEARCH_JSON && process.env.PRD_FE_TASK_FETCH_JSON) return
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

function findConfigUpwards(startDir) {
  let dir = resolve(startDir)
  while (dir !== dirname(dir)) {
    const config = join(dir, '.lark-fe-task', 'config.env')
    if (existsSync(config)) return config
    dir = dirname(dir)
  }
  return null
}

function parseConfigEnv(path) {
  const config = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (!match) continue
    config[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return config
}

function loadConfigFile(path) {
  const config = parseConfigEnv(path)
  repoRoot = config.REPO_ROOT || repoRoot
  feProjectPaths = config.FE_PROJECT_PATHS || feProjectPaths
  outputDir = config.OUTPUT_DIR || outputDir
  configStatus = 'loaded'
  configSource = path
}

function loadRegistryConfig() {
  if (!existsSync(registryFile) || readFileSync(registryFile, 'utf8').trim() === '') return false
  const data = JSON.parse(readFileSync(registryFile, 'utf8'))
  const repos = data.repos || []
  if (repos.length === 0) return false
  if (repos.length > 1) {
    console.error('Multiple prd-fe-task repositories are configured. Choose one and rerun +plan with its repo root:')
    repos.forEach((repo, index) => {
      console.error(`${index + 1}. ${repo.repoRoot} | FE_PROJECT_PATHS=${(repo.feProjectPaths || []).join(',')} | OUTPUT_DIR=${repo.outputDir}`)
    })
    process.exit(3)
  }

  const repo = repos[0]
  repoRoot = repo.repoRoot
  feProjectPaths = (repo.feProjectPaths || []).join(',')
  outputDir = repo.outputDir || outputDir
  configStatus = 'registry'
  configSource = registryFile
  return true
}

function isUrlOrToken(value) {
  return /^https?:\/\//.test(value) || /^[A-Za-z0-9]{20,}$/.test(value)
}

function stripHighlight(value) {
  return String(value || '').replace(/<\/?h>|<\/?hb>/g, '')
}

function norm(value) {
  return stripHighlight(value).toLowerCase().replace(/[\s_\-:：/（）()【】[\]]+/g, '')
}

function issueId(value) {
  const match = String(value || '').match(/(?:PR|pr)[-_\s]*([0-9]{3,})/)
  return match ? `pr${match[1]}` : null
}

function rankSearchResults(raw, query) {
  const data = JSON.parse(raw)
  const results = data?.data?.results || data.results || []
  const queryNorm = norm(query)
  const queryIssue = issueId(query)
  const negativeWords = ['提测', '自测', '测试情况', '测试报告', 'QA工作日报', 'QA工作周报', '工作日报', '工作周报', '准出', '日会', '周会']
  const positiveWords = ['需求背景', '需求详细', '技术实现', '计算公式', '原型', '目标', 'PRD', '需求文档']

  const ranked = results.map((item, index) => {
    const meta = item.result_meta || {}
    const title = stripHighlight(item.title_highlighted || meta.title || item.title)
    const summary = stripHighlight(item.summary_highlighted || item.summary || '')
    const haystack = `${title}\n${summary}`
    const haystackNorm = norm(haystack)
    const entity = String(item.entity_type || '').toUpperCase()
    const docTypes = String(meta.doc_types || '').toUpperCase()
    const url = meta.url || item.url || meta.token || item.token
    let score = 0

    if (queryNorm === norm(title)) score += 100
    if (queryIssue && issueId(title) === queryIssue) score += 80
    if (queryIssue && issueId(haystack) === queryIssue) score += 45
    if (queryNorm && haystackNorm.includes(queryNorm)) score += 30
    if (entity === 'DOC') score += 35
    if (docTypes.includes('DOCX')) score += 15
    if (entity === 'WIKI') score -= 25
    if (Object.hasOwn(meta, 'is_cross_tenant') && meta.is_cross_tenant === false) score += 10
    if (haystack.includes('副本')) score -= 20

    const negativeHits = negativeWords.filter((word) => haystack.includes(word))
    const positiveHits = positiveWords.filter((word) => haystack.includes(word))
    if (negativeHits.length) score -= 80
    score += 12 * positiveHits.length

    return {
      index,
      score,
      title,
      url,
      entity_type: entity,
      doc_types: docTypes,
      is_cross_tenant: meta.is_cross_tenant,
      negative_hits: negativeHits,
      positive_hits: positiveHits,
    }
  }).filter((item) => String(item.url || '').length > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)

  if (!ranked.length) die('No Lark document found')
  if (ranked.length > 1) {
    const [top, second] = ranked
    if (Math.abs(top.score - second.score) <= 8 && (top.negative_hits.length === 0) === (second.negative_hits.length === 0)) {
      console.error('Multiple similar Lark documents matched. Choose one and rerun with its URL:')
      ranked.slice(0, 8).forEach((item, index) => {
        console.error(`${index + 1}. score=${item.score} ${item.title} ${item.url}`)
      })
      process.exit(3)
    }
  }
  return ranked.slice(0, 8)
}

function classifyContent(content) {
  const prdMarkers = ['需求背景', '需求详细', '技术实现', '计算公式', '原型', '目标', '需求评审']
  const testMarkers = ['提测人', '自测情况', '自测结果', '环境准备', '风险说明', '覆盖范围', 'QA工作日报', 'QA工作周报', '准出']
  const prdScore = prdMarkers.filter((marker) => content.includes(marker)).length
  const testScore = testMarkers.filter((marker) => content.includes(marker)).length
  if (testScore >= 2 && prdScore === 0) return 'test-delivery'
  if (prdScore > 0) return 'prd'
  return 'unknown'
}

function fetchDocJson(ref) {
  if (process.env.PRD_FE_TASK_FETCH_JSON) return process.env.PRD_FE_TASK_FETCH_JSON
  return run('lark-cli', ['docs', '+fetch', '--as', 'user', '--api-version', 'v2', '--doc', ref, '--doc-format', 'markdown'])
}

function parseFetchJson(raw) {
  const data = JSON.parse(raw)
  const document = data?.data?.document || {}
  return {
    content: String(document.content || ''),
    documentId: String(document.document_id || ''),
  }
}

function slugify(raw) {
  const issue = String(raw || '').match(/(?:PR|pr)[-_\s]*([0-9]{3,})/)
  if (issue) return `pr-${issue[1]}`
  const slug = String(raw || '')
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  return slug || 'prd-fe-task'
}

function ensureOutputGitignore(root, dir) {
  const gitignoreFile = join(root, '.gitignore')
  let ignorePath = dir
  if (ignorePath.startsWith(`${root}/`)) ignorePath = ignorePath.slice(root.length + 1)
  ignorePath = ignorePath.replace(/^\/+/, '').replace(/\/+$/, '') + '/'
  if (!ignorePath || ignorePath.startsWith('../') || ignorePath.startsWith('/')) return

  const existing = existsSync(gitignoreFile) ? readFileSync(gitignoreFile, 'utf8') : ''
  if (existing.split(/\r?\n/).includes(ignorePath)) return
  const prefix = existing && !existing.endsWith('\n') ? '\n\n' : existing ? '\n' : ''
  writeFileSync(gitignoreFile, `${existing}${prefix}# prd-fe-task generated task breakdowns\n${ignorePath}\n`)
}

if (!docInput) die('Usage: plan-lark-doc.sh <lark-doc-title-or-url-or-token> [repo-root]', 2)
requireLarkCli()

if (repoRootArg) {
  repoRoot = repoRootArg
  const configFile = join(repoRoot, '.lark-fe-task', 'config.env')
  if (existsSync(configFile)) loadConfigFile(configFile)
} else {
  const configFile = findConfigUpwards(repoRoot)
  if (configFile) loadConfigFile(configFile)
  else loadRegistryConfig()
}

let docRef = docInput
let title = docInput
let docUrl = docInput
let documentId = ''
let documentClassification = 'unknown'
let documentSelection = 'direct input'
let fetchJson = ''
let content = ''

if (!isUrlOrToken(docInput)) {
  const searchJson = process.env.PRD_FE_TASK_SEARCH_JSON ||
    run('lark-cli', ['drive', '+search', '--as', 'user', '--query', docInput, '--doc-types', 'docx,doc,wiki', '--page-size', '20', '--format', 'json'])
  const candidates = rankSearchResults(searchJson, docInput)
  let selected = null

  for (const candidate of candidates) {
    const candidateFetchJson = fetchDocJson(candidate.url)
    const parsed = parseFetchJson(candidateFetchJson)
    const classification = classifyContent(parsed.content)
    if (classification === 'test-delivery') continue

    selected = { candidate, candidateFetchJson, parsed, classification }
    break
  }

  if (!selected) {
    console.error('No usable PRD document found. Search results look like test delivery, QA, or non-PRD documents.')
    console.error('Choose the real PRD URL and rerun:')
    candidates.forEach((item, index) => {
      console.error(`${index + 1}. score=${item.score} ${item.title} ${item.url}`)
    })
    process.exit(3)
  }

  docRef = selected.candidate.url
  docUrl = selected.candidate.url
  documentSelection = `selected from search: score=${selected.candidate.score} title=${selected.candidate.title}`
  if (selected.candidate.negative_hits.length) {
    documentSelection += ` negative_hits=${selected.candidate.negative_hits.join(',')}`
  }
  documentClassification = selected.classification
  fetchJson = selected.candidateFetchJson
  content = selected.parsed.content
  documentId = selected.parsed.documentId
} else {
  fetchJson = fetchDocJson(docRef)
  const parsed = parseFetchJson(fetchJson)
  content = parsed.content
  documentId = parsed.documentId
  documentClassification = classifyContent(content)
}

const docTitle = content.split(/\r?\n/).map((line) => {
  let match = line.match(/^<title>(.*)<\/title>$/)
  if (match) return match[1]
  match = line.match(/^# (.*)$/)
  return match ? match[1] : ''
}).find(Boolean)

if (docTitle) title = docTitle

const outDir = join(repoRoot, outputDir)
const outFile = join(outDir, `${new Date().toISOString().slice(0, 10)}-${slugify(title)}.md`)
mkdirSync(outDir, { recursive: true })
ensureOutputGitignore(repoRoot, outputDir)

console.log(`DOCUMENT_REF=${docRef}
DOCUMENT_URL=${docUrl}
DOCUMENT_ID=${documentId}
DOCUMENT_CLASSIFICATION=${documentClassification}
DOCUMENT_SELECTION=${documentSelection}
REPO_ROOT=${repoRoot}
CONFIG_STATUS=${configStatus}
CONFIG_SOURCE=${configSource}
FE_PROJECT_PATHS=${feProjectPaths}
OUTPUT_PATH=${outFile}

--- LARK_DOC_MARKDOWN_BEGIN ---
${content}
--- LARK_DOC_MARKDOWN_END ---

Next: choose the affected FE project path from FE_PROJECT_PATHS, inspect it, use references/task-breakdown-template.md, then write the final task breakdown to OUTPUT_PATH.`)
