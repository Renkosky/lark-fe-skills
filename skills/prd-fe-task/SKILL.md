---
name: prd-fe-task
description: Turn Feishu/Lark requirement documents into concrete frontend task breakdowns. Use when the user provides a Lark document title, URL, or token and asks to read a PRD, requirement doc, or product spec and split it into FE development tasks for configured frontend project paths; supports +config, +list, and +plan shortcuts.
---

# PRD FE Task

## Overview

Use this skill to produce a development-ready FE task breakdown from a Feishu/Lark requirement document. Phase 1 only plans tasks and writes a Markdown task file; it does not implement code changes.

Default repo root: the current repository root, referred to below as `<repo-root>`  
Default output directory: `docs/frontend-tasks`  
Global repository registry: `$HOME/.codex/skills/prd-fe-task/config/repos.json`

## Prerequisite

Before using `+config` or `+plan`, make sure `lark-cli` is installed, configured, and authorized:

```bash
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

If `lark-cli` is missing, the helper scripts must stop and tell the user to install and configure it first.

## Shortcuts

### +config

Use `+config` when the user wants to initialize or update the repository settings for this skill. Treat prompts such as `+config`, `配置 prd-fe-task`, or `设置前端项目路径` as requests to run the configuration workflow, not as requests to generate a task breakdown.

Run it once per repository before planning tasks. It records the repository root, frontend project path or paths, and output directory in both places:

- `<repo-root>/.lark-fe-task/config.env`: repository-local config.
- `$HOME/.codex/skills/prd-fe-task/config/repos.json`: global registry used for listing and fallback selection.

Because repository-local config contains machine-specific paths, `+config` must ensure `<repo-root>/.gitignore` contains `.lark-fe-task/`.

Accepted Codex invocation:

```text
+config <repo-root> <fe-project-paths> [output-dir]
```

Examples:

```text
+config 当前仓库 apps/web,apps/admin
+config /path/to/repo . docs/frontend-tasks
```

When the user provides incomplete arguments:

- Infer `<repo-root>` from the current working directory by walking up to the nearest git/workspace root when possible.
- If frontend paths are not provided, inspect the repo lightly and propose likely FE project paths; ask the user to confirm before writing config.
- Use `docs/frontend-tasks` as the default output directory unless the user provides another path.

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "<repo-root>" "<fe-project-paths>" "docs/frontend-tasks"
```

Example only:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "$(pwd)" "apps/web,apps/admin" "docs/frontend-tasks"
```

If the user has not configured the repository, ask for or infer these values before producing a task breakdown.

### +list

Use `+list` when the user asks which repositories are configured, for example `目前配置了哪些仓库`.

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/list-configs.sh"
```

Do not scan the user's home directory to answer this. Read the global registry instead. If the registry does not exist or is empty, tell the user no repositories are configured yet and show the `+config` usage.

### +plan

Use `+plan` when the user wants to split a Lark requirement document into FE development tasks.

Accepted inputs:

- Lark document URL
- Lark document token
- Document title, for example `【PR-00000】示例前端需求标题`

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/plan-lark-doc.sh" "<document-title-or-url-or-token>" "<repo-root>"
```

The helper command resolves config in this order, fetches the document Markdown with `lark-cli`, and prints the source content plus the configured FE project paths and target output path:

1. If a repo root argument is provided, read `<repo-root>/.lark-fe-task/config.env`.
2. If no repo root is provided, walk upward from the current directory to find `.lark-fe-task/config.env`.
3. If no local config is found, read the global registry.
4. If the registry has exactly one repo, use it.
5. If the registry has multiple repos, stop and ask the user which repo root to use.

Then follow the workflow below to inspect the relevant configured FE project path and write the final task breakdown Markdown.

## Workflow

1. Locate the source document.
   - If the user gives a Feishu/Lark URL or token, fetch it directly with `lark-cli docs +fetch --as user --api-version v2 --doc "<url-or-token>" --doc-format markdown`.
   - If the user gives a title, search with `lark-cli drive +search --as user --query "<title>" --doc-types docx,doc,wiki --page-size 20 --format json`.
   - Prefer broad keyword search over `intitle:` when exact title search misses Wiki/DOCX results.
   - When multiple results appear, prefer the exact title without `副本`; prefer non-cross-tenant results unless the user explicitly asks for an external/copy document.

2. Read the document fully.
   - Fetch the selected document in Markdown.
   - If the document is inaccessible, unreadable, partial, or image/PDF-only without extractable text, stop and ask the user for a readable source before planning.
   - If fetched content contains embedded docs such as `<cite ... token="...">`, only follow them when they are required to understand the requested requirement.
   - Ignore native App/mobile-only sections unless they affect browser-based FE behavior; this skill plans browser/admin/frontend project work in the configured FE project paths.

3. Decide the affected FE project path.
   - If the document clearly names a configured project path or business surface, use that path.
   - In a monorepo, configured FE paths may include multiple projects such as a public web app and admin apps.
   - If the document points to a FE project that is not configured, or if multiple configured paths are plausible, ask the user which project path to include before writing the final Markdown.
   - For a non-monorepo project, the configured FE path may be `.`.

4. Inspect the repository just enough to ground the plan.
   - Check likely affected FE entrypoints under the selected configured FE project path or paths.
   - Use `rg`/`rg --files` to find existing pages, components, services, stores, i18n, permissions, and tracking patterns mentioned by the requirement.
   - Do not edit app code in this phase.

5. Write the task breakdown Markdown.
   - Use `references/task-breakdown-template.md`.
   - Before writing, ensure `<repo-root>/.gitignore` contains the configured output directory, for example `docs/frontend-tasks/`; append it if missing so generated task files are not committed.
   - Save to `<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>.md` when the document title contains an issue ID such as `PR-00000`.
   - If no issue ID exists, save to `<repo-root>/<output-dir>/<YYYY-MM-DD>-<document-title-slug>.md`.
   - Use lowercase ASCII filenames; keep the slug short and avoid adding extra business keywords when an issue ID is available.

## Task Rules

- Split work into tasks that are directly actionable for a frontend engineer.
- Only include affected configured FE project paths/modules/pages. Do not write "not involved" rows for projects that are out of scope.
- Treat browser-based public sites, admin consoles, and other web frontends as FE projects when they are configured.
- Ignore native App/mobile-only content unless it clarifies shared browser FE requirements.
- Group tasks by FE project path first when multiple configured projects are involved, then by user flow or feature area.
- Every task must include: goal, affected FE scope, code-location clues, main changes, API/data/i18n/permission/tracking impact, acceptance checks, and dependencies.
- Preserve product details from the document, especially modal behavior, validation order, state transitions, permission gates, routing, empty/loading/error states, and cross-project dependencies.
- Put uncertain product behavior or missing backend contracts in `待确认问题`; do not invent behavior to make the plan look complete.
- If the document is onboarding/reference material rather than a feature requirement, say so and produce a short reference-oriented breakdown instead of inventing development tasks.

## Verification

Before finishing, verify:

- The Markdown file exists in `docs/frontend-tasks`.
- The output directory is ignored by `<repo-root>/.gitignore`.
- The task list is concrete enough to implement without rereading the source document for basic sequencing.
- No app source files were changed.
- Any missing requirement details are listed under `待确认问题`.

## TODO / Roadmap

Planned but not implemented yet:

- Phase 2: turn generated frontend task Markdown into Lark schedule tasks.
  - Parse tasks from generated Markdown files, using `#### Task N: ...` sections as the initial task boundary.
  - Accept a Lark schedule Base URL or title, because different teams store schedules in different places.
  - Read the target Base schema before mapping fields, including task name, task description, task status, start time, and end time.
  - Read custom task status options from the Base; do not invent status tags.
  - First implementation should be dry-run only: show the mapped records that would be created, but do not write to Lark.
  - Later implementation can add a confirmation step and then create records in the schedule Base.
