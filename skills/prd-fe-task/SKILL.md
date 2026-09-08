---
name: prd-fe-task
description: Turn Feishu/Lark requirement documents into concrete frontend task breakdowns. Use when the user provides a Lark document title, URL, or token and asks to read a PRD, requirement doc, or product spec and split it into FE development tasks for configured frontend project paths; supports +config, +list, and +plan shortcuts.
---

# PRD FE Task

## Overview

Produce two linked artifacts from one reading of a Feishu/Lark requirement: a concise task summary for scheduling and a detailed implementation specification for development. This skill does not implement app code.

Default repo root: the current repository root, referred to below as `<repo-root>`  
Default output directory: `docs/frontend-tasks`  
Global repository registry: `$HOME/.codex/skills/prd-fe-task/config/repos.json`

## Prerequisite

Before using `+config` or `+plan`, make sure Node.js is available and `lark-cli` is installed, configured, and authorized:

```bash
npm --version
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

Then follow the workflow below and write both artifacts. These shortcuts are agent instructions in Codex, not additional shell commands.

## Workflow

1. Locate the source document.
   - If the user gives a Feishu/Lark URL or token, fetch it directly with `lark-cli docs +fetch --as user --api-version v2 --doc "<url-or-token>" --doc-format markdown`.
   - If the user gives a title, search with `lark-cli drive +search --as user --query "<title>" --doc-types docx,doc,wiki --page-size 20 --format json`.
   - Prefer broad keyword search over `intitle:` when exact title search misses Wiki/DOCX results.
   - When multiple results appear, prefer the official PRD/requirement document over test-delivery, QA daily/weekly, release-check, or self-test documents, even when the titles share the same PR number.
   - Prefer exact title/PR-number matches, `DOC`/`DOCX` results, non-cross-tenant results, and documents whose content includes PRD markers such as `需求背景`, `目标`, `需求详细`, `技术实现`, `计算公式`, or `原型`.
   - Penalize or reject documents whose title or content is mainly `提测`, `自测`, `QA工作日报`, `QA工作周报`, `准出`, `环境准备`, or `风险说明`.
   - If multiple credible PRD candidates remain close after scoring, stop and ask the user to choose the real PRD URL before writing the task Markdown.

2. Read the requested scope fully.
   - Fetch the selected document in Markdown.
   - For a named section, read that whole section and its necessary references. For a full PRD, read the whole document. Check pagination/truncation; recover missing chunks before generating final artifacts.
   - Inspect relevant prototypes, images, tables, and attachments with available Lark tools. If required content cannot be read, identify the exact gap and request a readable source; never claim full coverage from text alone.
   - If the fetched content is classified as a test-delivery/self-test document rather than a PRD, do not generate development tasks from it unless the user explicitly confirms that this is the intended source.
   - If fetched content contains embedded docs such as `<cite ... token="...">`, only follow them when they are required to understand the requested requirement.
   - Resolve scope against the configured frontend paths, including public sites, admin consoles, and H5. A mobile screenshot alone does not establish a native-App-only requirement. Ask about ambiguous target projects; exclude confirmed out-of-scope sections explicitly.

3. Inspect relevant configured frontend entrypoints and nearby reusable components, data contracts, validation, permissions, i18n, and mock conventions. Record only verified relative paths and contracts in the spec. Distinguish source facts, repository evidence, proposed UI models, and unresolved backend contracts.

4. Write the task summary and implementation specification.
   - Read `references/task-breakdown-template.md` and `references/implementation-spec-template.md`.
   - Before writing, ensure `<repo-root>/.gitignore` contains the configured output directory, for example `docs/frontend-tasks/`; append it if missing so generated task files are not committed.
   - Save to `<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>.md` when the document title contains an issue ID such as `PR-00000`.
   - If no issue ID exists, save to `<repo-root>/<output-dir>/<YYYY-MM-DD>-<document-title-slug>.md`.
   - Use lowercase ASCII filenames; keep the slug short and avoid adding extra business keywords when an issue ID is available.
   - Write the companion `<same-basename>-implementation-spec.md` in the same output directory. The helper prints `OUTPUT_PATH` and `IMPLEMENTATION_SPEC_PATH`; it fetches source and suggests paths, while the agent writes the artifacts.
   - Honor repository-specific artifact paths before the default. Keep both files within the ignored planning directory.
   - Use identical Task IDs and titles across both files. Preserve IDs on revisions, and preserve human edits and any existing implementation progress.
   - Write Markdown directly with the available file editor; do not generate one-off write scripts.

## Task Rules

- Split work into concise, actionable frontend tasks intended for Lark task creation.
- In the schedule summary, write only `### Task N: <title>` and `任务概要` for every task, following `references/task-breakdown-template.md`.
- Keep app names, code locations, APIs, acceptance checks, and dependency sections in the companion spec, not in the schedule summary.
- Keep all product detail needed to understand the task in `任务概要`, including modal behavior, validation order, state transitions, permission gates, routing, and important loading/error behavior.
- Preserve document-defined formulas, examples, and old/new comparisons in the relevant task overview.
- Mark genuinely unknown product or backend details as `待确认:` inside the relevant task overview. Do not invent behavior.
- In the spec, preserve all in-scope product details: exact copy, field semantics, types, formatting/rounding, validation triggers/order, formulas, examples, status transitions and failure branches. Do not infer transactions, API enums, field names, or balance handling from desired UI behavior.
- If the document is onboarding/reference material rather than a feature requirement, state that no development task should be created instead of inventing tasks; no implementation spec is needed.

## Verification

Before finishing, verify:

- Both Markdown files exist in the resolved output directory and have matching Task IDs/titles.
- The output directory is ignored by `<repo-root>/.gitignore`.
- Every generated task has only a concise title and `任务概要` suitable for a Lark task description.
- No app source files were changed.
- Any missing requirement details are marked as `待确认:` in the relevant task overview.
- The spec's coverage table accounts for every in-scope section, including fields, copy, formulas, examples and error paths; omissions and contradictory requirements remain explicit.
- Report both file links. Pass only the compact summary to `prd-fe-schedule`; use the companion spec with `prd-fe-implement`.

## 中文要点

一次读取需求，同时生成用于排期的精简概要和用于开发的详细规格。两份文档保持相同 Task 编号；字段类型、格式化、校验顺序、完整文案、公式案例及异常分支放入开发细则。区分原文要求、已验证代码、实现建议与待确认项，不补造接口契约。仅生成文档，不修改业务代码。

排期使用 `prd-fe-schedule`；开发使用 `prd-fe-implement`。完整路线图见项目根 README。
