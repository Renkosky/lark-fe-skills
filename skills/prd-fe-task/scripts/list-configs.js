#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const skillDir = resolve(dirname(new URL(import.meta.url).pathname), '..')
const registryFile = join(skillDir, 'config', 'repos.json')

function emptyMessage() {
  console.log(`No prd-fe-task repositories are configured yet.

Use:
  +config <repo-root> <fe-project-paths> [output-dir]`)
}

if (!existsSync(registryFile) || readFileSync(registryFile, 'utf8').trim() === '') {
  emptyMessage()
  process.exit(0)
}

const data = JSON.parse(readFileSync(registryFile, 'utf8'))
const repos = data.repos || []
if (repos.length === 0) {
  emptyMessage()
  process.exit(0)
}

console.log('Configured prd-fe-task repositories:')
repos.forEach((repo, index) => {
  console.log(`
${index + 1}. ${repo.repoRoot}
   FE_PROJECT_PATHS=${(repo.feProjectPaths || []).join(',')}
   OUTPUT_DIR=${repo.outputDir}
   UPDATED_AT=${repo.updatedAt}`)
})
