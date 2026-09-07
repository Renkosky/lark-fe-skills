#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import YAML from 'yaml'

const command = process.argv[2]
let argv = process.argv.slice(3)

const scriptDir = dirname(fileURLToPath(import.meta.url))
const skillDir = resolve(scriptDir, '..')
const taskSkillDir = resolve(skillDir, '..', 'prd-fe-task')
const defaultProfile = join(skillDir, 'config', 'profile.yaml')
const registryFile = join(taskSkillDir, 'config', 'repos.json')

const readonlyTypes = ['formula', 'lookup', 'created_time', 'modified_time', 'created_by', 'modified_by', 'auto_number']
const fieldAliases = {
  title: ['标题', '任务标题', '任务明细', '任务内容', 'Title', 'Task Title', 'Task Detail', 'Task Content'],
  description: ['备注', '任务描述', '描述', '任务详情', '详情', 'Description', 'Desc'],
  requirementId: ['需求ID', '需求 ID', 'PRD ID', 'Requirement ID'],
  status: ['任务状态', '状态', 'Status'],
  type: ['任务类型', '类型', 'Task Type', 'Type'],
  assignee: ['负责人', 'Owner', 'Assignee'],
  startDate: ['开始时间', '开始日期', 'Start Time', 'Start Date', 'Start'],
  endDate: ['完成时间', '结束时间', '结束日期', '截止时间', 'End Time', 'End Date', 'Due Date', 'Deadline', 'End'],
  estimateDays: ['工时（天）', '工时', '工作量', 'Work Days', 'Estimate'],
}
const fieldTypes = {
  title: ['text'],
  description: ['text'],
  requirementId: ['text'],
  status: ['select'],
  type: ['select'],
  assignee: ['user'],
  startDate: ['datetime'],
  endDate: ['datetime'],
  estimateDays: ['number'],
}

function die(message, code = 1) {
  console.error(message)
  process.exit(code)
}

function commandExists(cmd) {
  return spawnSync('which', [cmd], { stdio: 'ignore' }).status === 0
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    die(result.stderr || result.stdout || `Command failed: ${cmd} ${args.join(' ')}`, result.status || 1)
  }
  return result.stdout
}

function jsonItems(raw) {
  const data = JSON.parse(raw)
  return data?.data?.items || data?.data?.tables || data?.data?.fields || data.items || data.tables || data.fields || []
}

function requireLarkCli() {
  if (process.env.PRD_FE_SCHEDULE_TABLES_JSON && process.env.PRD_FE_SCHEDULE_FIELDS_JSON) return
  if (commandExists('lark-cli')) return
  die(`Error: lark-cli is required but was not found in PATH.

Please install and configure Lark CLI before using prd-fe-schedule:

  npm install -g @larksuite/cli
  lark-cli config init
  lark-cli auth login --recommend

Official lark-cli documentation:
  https://github.com/larksuite/cli/tree/main`, 127)
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[\s_\-:：/（）()【】[\]]+/g, '')
}

function fieldName(field) {
  return field.field_name || field.fieldName || field.name || field.field_id || field.id
}

function fieldId(field) {
  return field.field_id || field.fieldId || field.id || fieldName(field)
}

function fieldType(field) {
  return String(field.type || '')
}

function writable(field) {
  return !readonlyTypes.includes(fieldType(field))
}

function findField(fields, names, types) {
  const wanted = names.map(norm)
  return fields.find((field) => (
    wanted.includes(norm(fieldName(field))) &&
    writable(field) &&
    (!types || types.includes(fieldType(field)))
  ))
}

function collectOptions(value, out = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOptions(item, out))
  } else if (value && typeof value === 'object') {
    if (typeof value.name === 'string') out.push(value.name)
    if (typeof value.text === 'string') out.push(value.text)
    Object.values(value).forEach((item) => collectOptions(item, out))
  }
  return out
}

function extractBaseToken(input) {
  const value = String(input || '')
  let match = value.match(/\/base\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  match = value.match(/(app_[A-Za-z0-9]+)/)
  if (match) return match[1]
  if (/^app_[A-Za-z0-9]+$/.test(value)) return value
  if (/^[A-Za-z0-9]{20,}$/.test(value)) return value
  return null
}

function resolveBaseToken(input) {
  const token = extractBaseToken(input)
  if (token) return token
  if (process.env.PRD_FE_SCHEDULE_BASE_TOKEN) return process.env.PRD_FE_SCHEDULE_BASE_TOKEN
  const raw = run('lark-cli', ['docs', '+search', '--as', 'user', '--query', String(input || ''), '--filter', '{"doc_types":["BITABLE"]}', '--page-size', '20', '--format', 'json'])
  const data = JSON.parse(raw)
  const results = data?.data?.results || data.results || []
  const chosen = results.find((item) => [item.title, item.title_highlighted].filter(Boolean).some((title) => title.replace(/<\/?h>|<\/?hb>/g, '') === input)) || results[0]
  if (!chosen) die('No Lark Base found')
  const value = chosen?.result_meta?.url || chosen?.result_meta?.token || chosen.url || chosen.token
  return extractBaseToken(value) || die('Could not extract Base token from search result')
}

function readTables(baseToken) {
  if (process.env.PRD_FE_SCHEDULE_TABLES_JSON) return jsonItems(process.env.PRD_FE_SCHEDULE_TABLES_JSON)
  return jsonItems(run('lark-cli', ['base', '+table-list', '--base-token', baseToken, '--limit', '100']))
}

function chooseTable(tables, tableInput) {
  const input = String(tableInput || '')
  if (!input) {
    if (tables.length === 1) return tables[0]
    console.error('Multiple tables found. Choose one and rerun with table-id-or-name:')
    tables.forEach((table, index) => {
      console.error(`${index + 1}. ${tableName(table)} (${tableId(table)})`)
    })
    process.exit(3)
  }
  const table = tables.find((item) => [item.table_id, item.tableId, item.id, item.table_name, item.tableName, item.name].filter(Boolean).map(String).includes(input))
  return table || die(`Table not found: ${input}`)
}

function tableId(table) {
  return table.table_id || table.tableId || table.id || table.table_name || table.name
}

function tableName(table) {
  return table.table_name || table.tableName || table.name || table.table_id || table.id
}

function readFields(baseToken, tableIdValue) {
  if (process.env.PRD_FE_SCHEDULE_FIELDS_JSON) return jsonItems(process.env.PRD_FE_SCHEDULE_FIELDS_JSON)
  return jsonItems(run('lark-cli', ['base', '+field-list', '--base-token', baseToken, '--table-id', tableIdValue, '--limit', '200']))
}

function authJson() {
  if (process.env.PRD_FE_SCHEDULE_AUTH_JSON) return JSON.parse(process.env.PRD_FE_SCHEDULE_AUTH_JSON)
  if (!commandExists('lark-cli')) return {}
  const result = spawnSync('lark-cli', ['auth', 'status'], { encoding: 'utf8' })
  if (result.status !== 0) return {}
  try {
    return JSON.parse(result.stdout)
  } catch {
    return {}
  }
}

function currentUserFromAuth(auth) {
  const userIdentity = auth?.identities?.user || {}
  const identity = String(auth?.identity || (userIdentity.status === 'ready' ? 'user' : ''))

  return {
    identity,
    openId: String(auth?.userOpenId || userIdentity.userOpenId || userIdentity.openId || ''),
    name: String(auth?.userName || userIdentity.userName || userIdentity.name || ''),
  }
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

function loadRegistryRoot() {
  if (!existsSync(registryFile) || readFileSync(registryFile, 'utf8').trim() === '') return null
  const data = JSON.parse(readFileSync(registryFile, 'utf8'))
  const repos = data.repos || []
  return repos.length === 1 ? repos[0].repoRoot : null
}

function sourceConfigEnv(path) {
  const config = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (!match) continue
    config[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return config
}

function resolveTaskFile(input) {
  if (String(input).toLowerCase().endsWith('-implementation-spec.md')) {
    die('Use the companion task-summary Markdown for scheduling, not the implementation spec.', 2)
  }
  if (existsSync(input) && statSync(input).isFile()) return resolve(input)
  let repoRoot = process.cwd()
  let outputDir = 'docs/frontend-tasks'
  const configFile = findConfigUpwards(repoRoot)
  if (configFile) {
    const config = sourceConfigEnv(configFile)
    repoRoot = config.REPO_ROOT || repoRoot
    outputDir = config.OUTPUT_DIR || outputDir
  } else {
    const registryRoot = loadRegistryRoot()
    if (registryRoot) {
      repoRoot = registryRoot
      const configPath = join(repoRoot, '.lark-fe-task', 'config.env')
      if (existsSync(configPath)) outputDir = sourceConfigEnv(configPath).OUTPUT_DIR || outputDir
    }
  }

  const dirs = [join(repoRoot, outputDir), join(process.cwd(), 'docs/frontend-tasks'), process.cwd()]
    .filter((dir, index, arr) => existsSync(dir) && arr.indexOf(dir) === index)
  const query = String(input || '').toLowerCase()
  const matches = dirs.flatMap((dir) => {
    const result = spawnSync('find', [dir, '-maxdepth', '1', '-name', '*.md', '-type', 'f'], { encoding: 'utf8' })
    return result.status === 0 ? result.stdout.split(/\r?\n/).filter(Boolean) : []
  }).filter((path, index, arr) => (
    !basename(path).toLowerCase().endsWith('-implementation-spec.md') &&
    (basename(path).toLowerCase().includes(query) || path.toLowerCase().includes(query)) &&
    arr.indexOf(path) === index
  ))

  if (!matches.length) die(`No task Markdown matched: ${input}\nSearched directories:\n${dirs.map((dir) => `- ${dir}`).join('\n')}`)
  if (matches.length > 1) die(`Multiple task Markdown files matched. Choose one and rerun:\n${matches.map((path, index) => `${index + 1}. ${path}`).join('\n')}`, 3)
  return resolve(matches[0])
}

function sectionValue(block, label) {
  const lines = block.split(/\r?\n/)
  const start = lines.findIndex((line) => new RegExp(`^\\s*-\\s*${label}\\s*[:：]\\s*`).test(line))
  if (start < 0) return ''
  const first = lines[start].replace(new RegExp(`^\\s*-\\s*${label}\\s*[:：]\\s*`), '').trim()
  const collected = []
  if (first) collected.push(first)
  for (const line of lines.slice(start + 1)) {
    if (/^\s*-\s*[^:\n：]+[:：]/.test(line)) break
    const nested = line.match(/^\s{2,}-\s*(.+)/)
    if (nested) collected.push(nested[1].trim())
    else if (line.trim()) collected.push(line.trim())
  }
  return collected.join('; ')
}

function parseTasks(taskFile) {
  const md = readFileSync(taskFile, 'utf8')
  const matches = [...md.matchAll(/^####\s+Task\s+\d+\s*[:：]\s*(.+)$/gm)]
  const tasks = matches.map((match, index) => {
    const start = match.index + match[0].length
    const nextTask = index + 1 < matches.length ? matches[index + 1].index : md.length
    const nextParentHeading = md.slice(start, nextTask).match(/^#{1,3}\s+/m)
    const end = nextParentHeading ? start + nextParentHeading.index : nextTask
    const block = md.slice(start, end)
    return {
      title: match[1].trim(),
      goal: sectionValue(block, '任务概要') || sectionValue(block, '任务目标'),
      changes: sectionValue(block, '主要改动点'),
      acceptance: sectionValue(block, '验收点'),
      dependencies: sectionValue(block, '前置依赖'),
    }
  })
  if (!tasks.length) die('No task blocks found. Expected headings like: #### Task 1: ...')
  return [md, tasks]
}

function extractRequirementId(md, taskFile) {
  const source = `${basename(taskFile)}\n${md.split(/\r?\n/).slice(0, 80).join('\n')}`
  const match = source.match(/(?:PR|pr)[-_\s]*([0-9]{3,})/)
  return match ? `PR-${match[1]}` : ''
}

function inferFieldMap(fields) {
  const result = {}
  for (const [key, aliases] of Object.entries(fieldAliases)) {
    const field = findField(fields, aliases, fieldTypes[key])
    if (field) result[key] = fieldName(field)
  }
  if (!result.title) {
    const usedFieldNames = new Set(Object.values(result))
    const fallbackTitleField = fields.find((field) => (
      writable(field) &&
      fieldType(field) === 'text' &&
      !usedFieldNames.has(fieldName(field))
    ))
    if (fallbackTitleField) result.title = fieldName(fallbackTitleField)
  }
  return result
}

function selectOptionsFor(fields, fieldNameValue) {
  const field = fields.find((item) => fieldName(item) === fieldNameValue)
  return field ? [...new Set(collectOptions(field))] : []
}

function typeOptionsForProfile(fields, fieldMapOrProfile) {
  const typeFieldName = fieldMapOrProfile?.type || fieldMapOrProfile?.fields?.type
  return typeFieldName ? selectOptionsFor(fields, typeFieldName) : []
}

function recordKeyFromType(typeValue, mode, index) {
  const slug = String(typeValue || `record-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug) return slug
  return mode === 'perTask' ? 'development' : `summary-${index + 1}`
}

function buildRecordRule(typeValue, mode, index) {
  const record = {
    key: recordKeyFromType(typeValue, mode, index),
    mode,
    title: mode === 'perTask' ? '{{task.title}}' : String(typeValue || 'Summary'),
    description: mode === 'perTask'
      ? '{{task.goal}}\n{{task.changes}}\n{{task.acceptance}}\n{{task.dependencies}}'
      : `根据前端任务拆分自动生成的${typeValue || 'summary'}汇总任务。`,
  }
  if (typeValue) record.type = typeValue
  return record
}

function inferRecords(fields, fieldMap) {
  const typeOptions = typeOptionsForProfile(fields, fieldMap)
  const dev = typeOptions.find((option) => ['development', 'dev', '开发'].some((candidate) => norm(option) === norm(candidate))) ||
    typeOptions.find((option) => /dev|develop|开发/i.test(option))
  return [buildRecordRule(dev, 'perTask', 0)]
}

function inferDefaults(fields, fieldMap) {
  const defaults = {}
  if (fieldMap.status) {
    const options = selectOptionsFor(fields, fieldMap.status)
    defaults.status = options.find((option) => norm(option) === norm('未开始')) ||
      options.find((option) => /todo|open|backlog|not started/i.test(option))
  }
  if (fieldMap.assignee) defaults.assignee = 'currentUser'
  return Object.fromEntries(Object.entries(defaults).filter(([, value]) => value))
}

function yamlValue(value) {
  const text = String(value ?? '')
  if (!text) return '""'
  if (/^[A-Za-z0-9_\-./@（）()一-龥]+$/.test(text)) return text
  return JSON.stringify(text)
}

function profileYaml(profile) {
  const fields = Object.entries(profile.fields || {}).map(([key, value]) => `  ${key}: ${yamlValue(value)}`).join('\n')
  const defaults = Object.entries(profile.defaults || {}).map(([key, value]) => `  ${key}: ${yamlValue(value)}`).join('\n')
  const records = (profile.records || []).map((record) => {
    const lines = [`  - key: ${yamlValue(record.key)}`, `    mode: ${yamlValue(record.mode)}`]
    if (record.type) lines.push(`    type: ${yamlValue(record.type)}`)
    lines.push(`    title: ${JSON.stringify(String(record.title || ''))}`)
    lines.push(`    description: ${JSON.stringify(String(record.description || ''))}`)
    return lines.join('\n')
  }).join('\n')
  const availableTypeOptions = (profile.availableTypeOptions || []).map((option) => `# - ${option}`).join('\n') || '# - (none)'

  return `# prd-fe-schedule profile
# 用途：定义如何把前端任务 Markdown 转成 Lark Base 排期记录。
#
# 可选字段说明：
# - title: 任务标题字段，通常是“标题”“任务名称”“任务明细”
# - description: 任务详情字段，通常是“描述”“备注”“任务描述”
# - requirementId: 需求编号字段，例如“需求ID”“PRD ID”
# - status: 状态字段，必须是 Base 中真实存在的 select 字段
# - type: 任务类型字段，可选；如果你的表没有任务类型，可以删除
# - assignee: 负责人字段，可选；通常是 user 字段
# - startDate: 开始时间字段，可选
# - endDate: 结束时间/完成时间字段，可选
# - estimateDays: 工时字段，可选
#
# 默认值说明：
# - status: 默认任务状态，必须匹配 Base select 选项
# - assignee: currentUser 表示使用当前 lark-cli 登录用户
#
# 记录生成规则：
# - mode: perTask 表示每个 Markdown Task 创建一条记录
# - mode: once 表示只创建一条汇总记录
# - type: 写入任务类型字段；如果没有 fields.type，可以省略
# - 可通过 +config-types 修改 records，并记住当前任务分类模式
# - title / description 支持模板变量：
#   {{task.title}}, {{task.goal}}, {{task.changes}}, {{task.acceptance}},
#   {{task.dependencies}}, {{requirementId}}
#
# Available type options from Base:
${availableTypeOptions}

name: ${yamlValue(profile.name || 'default')}

target:
  base: ${yamlValue(profile.target?.base)}
  table: ${yamlValue(profile.target?.table)}

fields:
${fields || '  {}'}

defaults:
${defaults || '  {}'}

records:
${records}
`
}

function readProfile(path) {
  return YAML.parse(readFileSync(path, 'utf8')) || {}
}

function writeProfile(path, profile, availableTypeOptions = []) {
  mkdirSync(dirname(resolve(path)), { recursive: true })
  writeFileSync(resolve(path), profileYaml({ ...profile, availableTypeOptions }))
}

function validateProfile(profile) {
  validateProfileTarget(profile)
  if (!profile?.fields?.title) die('Profile is missing fields.title')
  if (!Array.isArray(profile.records) || profile.records.length === 0) die('Profile records must be a non-empty array')
}

function validateProfileTarget(profile) {
  if (!profile?.target?.base) die('Profile is missing target.base')
  if (!profile?.target?.table) die('Profile is missing target.table')
}

function fieldByName(fields, name) {
  return fields.find((field) => fieldName(field) === name)
}

function validateMappedFields(profile, fields) {
  const pending = []
  const mapped = {}
  for (const [logical, actual] of Object.entries(profile.fields || {})) {
    if (!actual) continue
    const field = fieldByName(fields, String(actual))
    if (!field) {
      pending.push(`Profile field ${logical} maps to missing Base field: ${actual}.`)
      continue
    }
    if (!writable(field)) pending.push(`Profile field ${logical} maps to readonly field ${actual} (${fieldType(field)}).`)
    const expected = fieldTypes[logical]
    if (expected && !expected.includes(fieldType(field))) {
      pending.push(`Profile field ${logical} expects ${expected.join('/')} but ${actual} is ${fieldType(field)}.`)
    }
    mapped[logical] = field
  }
  return [mapped, pending]
}

function renderTemplate(template, task, requirementId) {
  const replacements = {
    '{{task.title}}': task.title,
    '{{task.goal}}': task.goal,
    '{{task.changes}}': task.changes,
    '{{task.acceptance}}': task.acceptance,
    '{{task.dependencies}}': task.dependencies,
    '{{requirementId}}': requirementId,
  }
  let value = String(template || '')
  for (const [key, replacement] of Object.entries(replacements)) {
    value = value.split(key).join(String(replacement || ''))
  }
  return value.replace(/\n{3,}/g, '\n\n').trim()
}

function buildRows(profile, tasks, requirementId, auth) {
  const defaults = profile.defaults || {}
  const currentUser = currentUserFromAuth(auth)
  const ownerId = currentUser.identity === 'user' ? currentUser.openId : ''
  const ownerName = currentUser.name
  const ownerValue = defaults.assignee === 'currentUser' && ownerId ? [{ id: ownerId }] : null
  const ownerLabel = ownerValue ? `${ownerName || ownerId} (${ownerId})` : ''
  const rows = []
  for (const record of profile.records || []) {
    const mode = String(record.mode || '')
    if (!['once', 'perTask'].includes(mode)) die(`Unsupported record mode: ${mode}`)
    const sourceTasks = mode === 'once' ? [null] : tasks
    for (const task of sourceTasks) {
      const currentTask = task || {}
      rows.push({
        type: record.type,
        status: defaults.status,
        title: renderTemplate(record.title || '{{task.title}}', currentTask, requirementId),
        description: renderTemplate(record.description || '', currentTask, requirementId),
        requirementId,
        assignee: ownerValue,
        assigneeLabel: ownerLabel,
        startDate: null,
        endDate: null,
        estimateDays: null,
        recordKey: record.key,
        recordMode: mode,
      })
    }
  }
  return rows
}

function validateValues(profile, mappedFields, rows) {
  const pending = []
  const defaults = profile.defaults || {}
  if (mappedFields.status) {
    const options = [...new Set(collectOptions(mappedFields.status))]
    if (defaults.status && !options.some((option) => norm(option) === norm(defaults.status))) {
      pending.push(`Status option does not exist: ${defaults.status}.`)
    }
  }
  if (mappedFields.type) {
    const options = [...new Set(collectOptions(mappedFields.type))]
    for (const typeValue of [...new Set(rows.map((row) => row.type).filter(Boolean))]) {
      if (!options.some((option) => norm(option) === norm(typeValue))) {
        pending.push(`Type option does not exist: ${typeValue}.`)
      }
    }
  }
  if (defaults.assignee === 'currentUser' && rows.some((row) => row.assignee === null)) {
    pending.push('Assignee defaults to currentUser, but lark-cli auth status has no user openId.')
  }
  return pending
}

function validateRecordTypes(records, typeOptions) {
  const invalid = [...new Set(records.map((record) => record.type).filter(Boolean))]
    .filter((typeValue) => !typeOptions.some((option) => norm(option) === norm(typeValue)))
  if (invalid.length) {
    die(`Unknown task type option(s): ${invalid.join(', ')}.

Available type options:
${typeOptions.length ? typeOptions.map((option) => `- ${option}`).join('\n') : '- (none)'}`, 3)
  }
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n+/g, '<br>')
}

function fieldMappingRows(profile, mappedFields, rows) {
  return [
    ['title', 'Task title/template', rows[0]?.title],
    ['description', 'Task details/template', rows[0]?.description],
    ['requirementId', 'Markdown filename/title', rows[0]?.requirementId],
    ['status', 'Profile defaults.status', rows[0]?.status],
    ['type', 'Profile records[].type', [...new Set(rows.map((row) => row.type).filter(Boolean))].join(', ')],
    ['assignee', 'Profile defaults.assignee', rows[0]?.assigneeLabel],
    ['startDate', 'Empty by default', ''],
    ['endDate', 'Empty by default', ''],
    ['estimateDays', 'Empty by default', ''],
  ].filter(([logical]) => String(profile.fields?.[logical] || '') !== '')
    .map(([logical, source, value]) => {
      const field = mappedFields[logical]
      return [logical, field ? `${fieldName(field)} (${fieldId(field)})` : '-', source, String(value || '')]
    })
}

function previewHeaders(context) {
  const fields = context.profile.fields || {}
  const headers = ['#', 'recordKey', 'mode', 'title']
  if (fields.status) headers.push('status')
  if (fields.type) headers.push('type')
  if (fields.requirementId) headers.push('requirementId')
  if (fields.assignee) headers.push('assignee')
  if (fields.description) headers.push('description')
  return headers
}

function previewRowValues(headers, row, index) {
  return headers.map((header) => {
    if (header === '#') return index + 1
    if (header === 'recordKey') return row.recordKey
    if (header === 'mode') return row.recordMode
    if (header === 'assignee') return row.assigneeLabel
    return row[header]
  })
}

function renderFullPreview(context, previewFile) {
  const createCommand = `+create ${context.taskFile}`
  const out = []
  out.push(`# PRD FE Schedule Dry-Run

## Source

- Task Markdown: ${context.taskFile}
- Parsed tasks: ${context.tasks.length}
- Profile: ${context.profilePath}
- Preview records: ${context.rows.length}
${previewFile ? `- Full preview file: ${previewFile}\n` : ''}

## Target

- Base: ${context.baseToken}
- Table: ${context.tableName} (${context.tableId})

## Record Rules

| Key | Mode | Type | Title Template |
| --- | --- | --- | --- |`)
  for (const record of context.profile.records) {
    out.push(`| ${cell(record.key)} | ${cell(record.mode)} | ${cell(record.type)} | ${cell(record.title)} |`)
  }
  out.push(`
## Field Mapping

| Logical Field | Matched Base Field | Source | Example Value |
| --- | --- | --- | --- |`)
  for (const [logical, matched, source, value] of fieldMappingRows(context.profile, context.mappedFields, context.rows)) {
    out.push(`| ${cell(logical)} | ${cell(matched)} | ${cell(source)} | ${cell(value)} |`)
  }
  out.push(`
## Record Preview`)
  const headers = previewHeaders(context)
  out.push(`| ${headers.join(' | ')} |`)
  out.push(`| ${headers.map(() => '---').join(' | ')} |`)
  context.rows.forEach((row, index) => {
    out.push(`| ${previewRowValues(headers, row, index).map(cell).join(' | ')} |`)
  })
  out.push(`
## Pending Questions
`)
  if (context.pending.length === 0) out.push('- None.')
  else [...new Set(context.pending)].forEach((item) => out.push(`- ${item}`))
  out.push(`
## Safety

Dry-run only. No Lark Base records were created or updated.

## Next Step

Review the field mapping, record rules, and preview rows above.

- If the task type layout is not right, run \`+config-types\` with the desired rules, then run dry-run again.
- If everything looks right and the user explicitly confirms, run \`${createCommand}\`.
- Do not create records without explicit confirmation.`)
  return out.join('\n')
}

function writePreviewFile(context) {
  const fileName = `prd-fe-schedule-preview-${Date.now()}.md`
  const previewFile = join(tmpdir(), fileName)
  writeFileSync(previewFile, renderFullPreview(context, previewFile))
  return previewFile
}

function recordSummary(row, index) {
  const parts = [`${index + 1}. ${row.title || '(untitled)'}`]
  if (row.type) parts.push(`type=${row.type}`)
  if (row.status) parts.push(`status=${row.status}`)
  if (row.assigneeLabel) parts.push(`assignee=${row.assigneeLabel}`)
  return parts.join(' | ')
}

function printCompactPreview(context, previewFile, options = {}) {
  const createCommand = `+create ${context.taskFile}`
  const typeValues = [...new Set(context.rows.map((row) => row.type).filter(Boolean))]
  const mapped = Object.entries(context.profile.fields || {})
    .filter(([logical]) => context.mappedFields[logical])
    .map(([logical, actual]) => `${logical}=${actual}`)
  const pending = [...new Set(context.pending)]
  console.log(`# PRD FE Schedule Dry-Run Summary

## Source

- Task Markdown: ${context.taskFile}
- Parsed tasks: ${context.tasks.length}
- Profile: ${context.profilePath}
- Preview records: ${context.rows.length}
- Full preview file: ${previewFile}

## Target

- Base: ${context.baseToken}
- Table: ${context.tableName} (${context.tableId})

## Summary

- Record rules: ${context.profile.records.map((record) => `${record.key}:${record.mode}${record.type ? `/${record.type}` : ''}`).join(', ')}
- Mapped fields: ${mapped.length ? mapped.join(', ') : '(none)'}
- Task types: ${typeValues.length ? typeValues.join(', ') : '(none)'}
- Assignee: ${context.rows.find((row) => row.assigneeLabel)?.assigneeLabel || '(none)'}
- Pending questions: ${pending.length}
`)

  const sampleLimit = options.verbose ? Math.min(2, context.rows.length) : 1
  console.log('## Record Samples')
  context.rows.slice(0, sampleLimit).forEach((row, index) => console.log(`- ${recordSummary(row, index)}`))
  if (context.rows.length > sampleLimit) console.log(`- ... ${context.rows.length - sampleLimit} more records hidden. Use --full to print all rows.`)

  console.log('\n## Pending Questions')
  if (pending.length === 0) console.log('- None.')
  else pending.forEach((item) => console.log(`- ${item}`))

  console.log(`
## Safety

Dry-run only. No Lark Base records were created or updated.

## Next Step

Review the summary above. Open the full preview file when you need every field and row.

- If the task type layout is not right, run \`+config-types\` with the desired rules, then run dry-run again.
- If everything looks right and the user explicitly confirms, run \`${createCommand}\`.
- Use \`--full\` only when you need to print the entire preview in the conversation.
- Do not create records without explicit confirmation.`)
}

function printPreview(context, options = {}) {
  const previewFile = writePreviewFile(context)
  if (options.full) console.log(renderFullPreview(context, previewFile))
  else printCompactPreview(context, previewFile, options)
}

function buildContext(taskInput, profilePath) {
  const profile = readProfile(profilePath)
  validateProfile(profile)
  const taskFile = resolveTaskFile(taskInput)
  const [md, tasks] = parseTasks(taskFile)
  const requirementId = extractRequirementId(md, taskFile)
  const baseToken = resolveBaseToken(profile.target.base)
  const table = chooseTable(readTables(baseToken), profile.target.table)
  const selectedTableId = tableId(table)
  const selectedTableName = tableName(table)
  const fields = readFields(baseToken, selectedTableId)
  const [mappedFields, pending] = validateMappedFields(profile, fields)
  const rows = buildRows(profile, tasks, requirementId, authJson())
  pending.push(...validateValues(profile, mappedFields, rows))
  return {
    profile,
    profilePath,
    taskFile,
    tasks,
    baseToken,
    tableId: selectedTableId,
    tableName: selectedTableName,
    fields,
    mappedFields,
    rows,
    pending,
  }
}

function createPayload(context) {
  const fieldsConfig = context.profile.fields || {}
  const orderedLogical = ['type', 'status', 'title', 'description', 'requirementId', 'assignee', 'startDate', 'endDate', 'estimateDays']
  const fieldNames = orderedLogical
    .filter((logical) => fieldsConfig[logical] && context.mappedFields[logical])
    .map((logical) => fieldsConfig[logical])
  const rows = context.rows.map((row) => orderedLogical
    .filter((logical) => fieldsConfig[logical] && context.mappedFields[logical])
    .map((logical) => {
      if (logical === 'title') return row.title
      if (logical === 'description') return row.description
      if (logical === 'requirementId') return row.requirementId
      if (logical === 'status') return row.status
      if (logical === 'type') return row.type
      if (logical === 'assignee') return row.assignee
      return null
    }))
  return { fields: fieldNames, rows }
}

function parseConfigArgs(args) {
  const options = { profile: defaultProfile, name: 'default' }
  const positional = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--name') {
      options.name = args[index + 1]
      index += 1
    } else {
      positional.push(args[index])
    }
  }
  return { options, positional }
}

function commandConfigSchedule() {
  const { options, positional } = parseConfigArgs(argv)
  const [baseInput, tableInput, profileArg] = positional
  if (profileArg) options.profile = profileArg
  if (!baseInput) die('Usage: config-schedule.sh <base-url-or-title> [table-id-or-name] [profile-path]', 2)
  requireLarkCli()

  const baseToken = resolveBaseToken(baseInput)
  const table = chooseTable(readTables(baseToken), tableInput)
  const selectedTableId = tableId(table)
  const fields = readFields(baseToken, selectedTableId)
  const fieldMap = inferFieldMap(fields)
  const availableTypeOptions = typeOptionsForProfile(fields, fieldMap)
  const profile = {
    name: options.name,
    target: { base: baseToken, table: selectedTableId },
    fields: fieldMap,
    defaults: inferDefaults(fields, fieldMap),
    records: inferRecords(fields, fieldMap),
  }

  writeProfile(options.profile, profile, availableTypeOptions)
  console.log(`Created schedule profile: ${resolve(options.profile)}

## Field Mapping Preview`)
  Object.entries(fieldMap).forEach(([logical, actual]) => console.log(`- ${logical}: ${actual}`))
  console.log('\n## Available Type Options')
  if (availableTypeOptions.length) availableTypeOptions.forEach((option) => console.log(`- ${option}`))
  else console.log('- (none)')
  console.log('\n## Record Rules Preview')
  profile.records.forEach((record) => console.log(`- ${record.key}: mode=${record.mode} type=${record.type || '(none)'} title=${record.title}`))
  console.log(`
## Next Step

1. Decide how task types should be scheduled. Use one of the Base type options above.
   Example: +config-types Development:perTask QA:once Release:once
2. After the profile looks right, run +dry-run <task-md-path-or-name>.
3. Only run +create after the dry-run preview is reviewed and explicitly confirmed.`)
}

function parseRunArgs(args) {
  const options = { profile: defaultProfile, yes: false, full: false, verbose: false }
  const positional = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--profile') {
      options.profile = args[index + 1]
      index += 1
    } else if (args[index] === '--yes') {
      options.yes = true
    } else if (args[index] === '--full') {
      options.full = true
    } else if (args[index] === '--verbose') {
      options.verbose = true
    } else {
      positional.push(args[index])
    }
  }
  return { options, positional }
}

function commandDryRun() {
  const { options, positional } = parseRunArgs(argv)
  const [taskInput, baseInput, tableInput] = positional
  if (baseInput && !existsSync(options.profile)) {
    requireLarkCli()
    const baseToken = resolveBaseToken(baseInput)
    const table = chooseTable(readTables(baseToken), tableInput)
    const fields = readFields(baseToken, tableId(table))
    const fieldMap = inferFieldMap(fields)
    const availableTypeOptions = typeOptionsForProfile(fields, fieldMap)
    const profile = {
      name: 'temporary',
      target: { base: baseToken, table: tableId(table) },
      fields: fieldMap,
      defaults: inferDefaults(fields, fieldMap),
      records: inferRecords(fields, fieldMap),
    }
    const tmp = join(tmpdir(), 'prd-fe-schedule-temporary-profile.yaml')
    writeProfile(tmp, profile, availableTypeOptions)
    options.profile = tmp
  }
  if (!taskInput) die('Usage: dry-run-schedule.sh [--profile <profile.yaml>] [--verbose] [--full] <task-md-path-or-name>', 2)
  if (!existsSync(options.profile)) die(`Profile not found: ${options.profile}. Run +config-schedule first or pass --profile <path>.`)
  requireLarkCli()
  printPreview(buildContext(taskInput, options.profile), options)
}

function parseTypeArgs(args) {
  const options = { profile: defaultProfile }
  const specs = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--profile') {
      options.profile = args[index + 1]
      index += 1
    } else {
      specs.push(args[index])
    }
  }
  return { options, specs }
}

function parseTypeSpec(spec, index) {
  const match = String(spec || '').match(/^(.+?):(perTask|once)$/)
  if (!match) {
    die(`Invalid task type rule: ${spec}

Expected format:
  <type-option>:perTask
  <type-option>:once`, 2)
  }
  return buildRecordRule(match[1], match[2], index)
}

function commandConfigTypes() {
  const { options, specs } = parseTypeArgs(argv)
  if (!existsSync(options.profile)) die(`Profile not found: ${options.profile}. Run +config-schedule first or pass --profile <path>.`)
  requireLarkCli()

  const profile = readProfile(options.profile)
  validateProfileTarget(profile)
  if (!profile.fields?.type) {
    die('Profile has no fields.type mapping. Add a task type select field to the profile before configuring task categories.', 3)
  }

  const baseToken = resolveBaseToken(profile.target.base)
  const table = chooseTable(readTables(baseToken), profile.target.table)
  const fields = readFields(baseToken, tableId(table))
  const [mappedFields, pending] = validateMappedFields(profile, fields)
  if (pending.length) {
    die(`Cannot configure task types until profile field issues are resolved:\n${[...new Set(pending)].map((item) => `- ${item}`).join('\n')}`, 3)
  }

  const typeOptions = mappedFields.type ? [...new Set(collectOptions(mappedFields.type))] : []
  if (!specs.length) {
    console.log(`# PRD FE Schedule Type Options

Profile: ${resolve(options.profile)}
Base: ${baseToken}
Table: ${tableName(table)} (${tableId(table)})

## Available Type Options`)
    if (typeOptions.length) typeOptions.forEach((option) => console.log(`- ${option}`))
    else console.log('- (none)')
    console.log(`
## Current Record Rules`)
    ;(profile.records || []).forEach((record) => console.log(`- ${record.key}: mode=${record.mode} type=${record.type || '(none)'} title=${record.title}`))
    console.log(`
To update and remember the classification rules, run:
  +config-types <type-option>:perTask <type-option>:once

Example:
  +config-types Development:perTask QA:once Release:once

Question 1: How do you want to arrange task types?
- Use perTask for a type that should create one record per frontend task.
- Use once for a type that should create one summary record.

Question 2: After updating the profile, should scheduling proceed with the current settings?
- Recommended: run +dry-run first, review the preview, then explicitly confirm +create.`)
    return
  }

  const records = specs.map(parseTypeSpec)
  validateRecordTypes(records, typeOptions)
  profile.records = records
  writeProfile(options.profile, profile, typeOptions)

  console.log(`Updated schedule task classification rules: ${resolve(options.profile)}

## Available Type Options`)
  typeOptions.forEach((option) => console.log(`- ${option}`))
  console.log('\n## Record Rules Preview')
  records.forEach((record) => console.log(`- ${record.key}: mode=${record.mode} type=${record.type || '(none)'} title=${record.title}`))
  console.log(`
## Next Step

Run +dry-run <task-md-path-or-name> to preview records with this saved profile.
Only run +create after the preview is reviewed and explicitly confirmed.`)
}

function commandCreate() {
  const { options, positional } = parseRunArgs(argv)
  const [taskInput] = positional
  if (!options.yes) die('create-schedule.sh requires --yes to write Lark Base records.', 2)
  if (!taskInput) die('Usage: create-schedule.sh --yes [--profile <profile.yaml>] <task-md-path-or-name>', 2)
  if (!existsSync(options.profile)) die(`Profile not found: ${options.profile}. Run +config-schedule first or pass --profile <path>.`)
  requireLarkCli()
  const context = buildContext(taskInput, options.profile)
  if (context.pending.length) {
    die(`Cannot create records until pending questions are resolved:\n${[...new Set(context.pending)].map((item) => `- ${item}`).join('\n')}`, 3)
  }

  const payloadPath = join(tmpdir(), `prd-fe-schedule-create-${Date.now()}.json`)
  writeFileSync(payloadPath, JSON.stringify(createPayload(context), null, 2))
  try {
    const result = run('lark-cli', ['base', '+record-batch-create', '--as', 'user', '--base-token', context.baseToken, '--table-id', context.tableId, '--json', `@${basename(payloadPath)}`], { cwd: tmpdir() })
    process.stdout.write(result)
  } finally {
    if (existsSync(payloadPath)) unlinkSync(payloadPath)
  }
}

if (command === 'config') commandConfigSchedule()
else if (command === 'config-types') commandConfigTypes()
else if (command === 'dry-run') commandDryRun()
else if (command === 'create') commandCreate()
else die(`Unknown command: ${JSON.stringify(command)}`, 2)
