#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const packageName = '@renkosky/lark-fe-skills'
const skillsRoot = join(packageRoot, 'skills')
const packagedSkills = ['prd-fe-task', 'prd-fe-schedule', 'prd-fe-implement']
const uninstallableSkills = [...packagedSkills, 'lark-fe-task']
const skillRuntimeDependencies = {
  'prd-fe-schedule': ['yaml'],
}

function usage() {
  console.log(`lark-fe-skills

Usage:
  lark-fe-skills list
  lark-fe-skills path [skill-name]
  lark-fe-skills install [skill-name]
  lark-fe-skills uninstall [skill-name]
  lark-fe-skills update [--dry-run]

Commands:
  list              List packaged skills.
  path              Print the package skills directory or one skill path.
  install           Copy all packaged skills, or one named skill, to $HOME/.codex/skills.
  uninstall         Remove all packaged skills, or one named skill, from $HOME/.codex/skills.
  update            Update this npm package to latest, then reinstall packaged Codex skills.

Examples:
  lark-fe-skills list
  lark-fe-skills path prd-fe-task
  lark-fe-skills install
  lark-fe-skills update
  lark-fe-skills uninstall
  lark-fe-skills uninstall lark-fe-task`)
}

function assertSkillName(skillName, validSkills = packagedSkills) {
  if (!validSkills.includes(skillName)) {
    console.error(`Unknown skill: ${skillName}`)
    console.error(`Available skills: ${validSkills.join(', ')}`)
    process.exit(1)
  }
}

function listSkills() {
  console.log('Available skills:')
  for (const skillName of packagedSkills) {
    console.log(`- ${skillName}`)
  }
}

function printPath(skillName) {
  if (skillName) {
    assertSkillName(skillName)
    console.log(join(skillsRoot, skillName))
    return
  }
  console.log(skillsRoot)
}

function installOneSkill(skillName) {
  assertSkillName(skillName)

  const source = join(skillsRoot, skillName)
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    console.error(`Packaged skill not found: ${source}`)
    process.exit(1)
  }

  const targetRoot = join(homedir(), '.codex', 'skills')
  const target = join(targetRoot, skillName)
  mkdirSync(targetRoot, { recursive: true })

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
  }
  cpSync(source, target, { recursive: true, force: true })

  for (const dependencyName of skillRuntimeDependencies[skillName] || []) {
    const dependencySource = join(packageRoot, 'node_modules', dependencyName)
    const dependencyTarget = join(target, 'node_modules', dependencyName)
    if (!existsSync(dependencySource)) {
      console.error(`Runtime dependency not found: ${dependencyName}`)
      console.error('Run npm install in the package before installing this skill.')
      process.exit(1)
    }
    mkdirSync(dirname(dependencyTarget), { recursive: true })
    cpSync(dependencySource, dependencyTarget, { recursive: true, force: true })
  }

  console.log(`Installed ${skillName} to ${target}`)
}

function installSkill(skillName) {
  if (skillName) {
    installOneSkill(skillName)
    return
  }

  for (const packagedSkill of packagedSkills) {
    installOneSkill(packagedSkill)
  }
}

function uninstallOneSkill(skillName) {
  assertSkillName(skillName, uninstallableSkills)

  const target = join(homedir(), '.codex', 'skills', skillName)

  if (!existsSync(target)) {
    console.log(`${skillName} is not installed at ${target}`)
    return
  }

  rmSync(target, { recursive: true, force: true })
  console.log(`Uninstalled ${skillName} from ${target}`)
}

function uninstallSkill(skillName) {
  if (skillName) {
    uninstallOneSkill(skillName)
    return
  }

  for (const packagedSkill of packagedSkills) {
    uninstallOneSkill(packagedSkill)
  }
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status || 1)
}

function updatePackage(args = []) {
  const dryRun = args.includes('--dry-run')
  const commands = [
    ['npm', ['install', '-g', `${packageName}@latest`]],
    ['npm', ['exec', '--yes', `--package=${packageName}@latest`, '--', 'lark-fe-skills', 'install']],
  ]

  if (dryRun) {
    console.log('Update commands:')
    for (const [commandName, commandArgs] of commands) {
      console.log(`- ${[commandName, ...commandArgs].join(' ')}`)
    }
    return
  }

  for (const [commandName, commandArgs] of commands) {
    runCommand(commandName, commandArgs)
  }

  console.log('Updated lark-fe-skills and reinstalled packaged Codex skills.')
  console.log('Restart Codex or open a new Codex session if the updated skills do not appear immediately.')
}

const [command, skillName, ...rest] = process.argv.slice(2)

switch (command) {
  case 'list':
    listSkills()
    break
  case 'path':
    printPath(skillName)
    break
  case 'install':
    installSkill(skillName)
    break
  case 'uninstall':
    uninstallSkill(skillName)
    break
  case 'update':
    updatePackage([skillName, ...rest].filter(Boolean))
    break
  case undefined:
  case '-h':
  case '--help':
    usage()
    break
  default:
    console.error(`Unknown command: ${command}`)
    usage()
    process.exit(1)
}
