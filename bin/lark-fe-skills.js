#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const skillsRoot = join(packageRoot, 'skills')
const packagedSkills = ['prd-fe-task']
const uninstallableSkills = [...packagedSkills, 'lark-fe-task']

function usage() {
  console.log(`lark-fe-skills

Usage:
  lark-fe-skills list
  lark-fe-skills path [skill-name]
  lark-fe-skills install [skill-name]
  lark-fe-skills uninstall [skill-name]

Commands:
  list              List packaged skills.
  path              Print the package skills directory or one skill path.
  install           Copy a packaged skill to $HOME/.codex/skills.
  uninstall         Remove an installed skill from $HOME/.codex/skills.

Examples:
  lark-fe-skills list
  lark-fe-skills path prd-fe-task
  lark-fe-skills install prd-fe-task
  lark-fe-skills uninstall prd-fe-task
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

function installSkill(skillName = 'prd-fe-task') {
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

  console.log(`Installed ${skillName} to ${target}`)
}

function uninstallSkill(skillName = 'prd-fe-task') {
  assertSkillName(skillName, uninstallableSkills)

  const target = join(homedir(), '.codex', 'skills', skillName)

  if (!existsSync(target)) {
    console.log(`${skillName} is not installed at ${target}`)
    return
  }

  rmSync(target, { recursive: true, force: true })
  console.log(`Uninstalled ${skillName} from ${target}`)
}

const [command, skillName] = process.argv.slice(2)

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
