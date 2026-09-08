---
name: prd-fe-schedule
description: Turn generated frontend task Markdown into Lark Base schedule records using a user-configured YAML profile. Use when the user provides a Phase 1 task breakdown Markdown path/name plus a Lark Base schedule profile and asks to configure, preview, map, or create frontend schedule tasks.
---

# PRD FE Schedule

## Overview

Use this skill to map a generated frontend task breakdown Markdown file into Lark Base schedule-task records. Schedule behavior is driven by a local YAML profile, so different teams can use different Base fields, statuses, task types, and record-generation rules.

Task source: a file path or name from the Phase 1 output directory, usually `docs/frontend-tasks`  
Schedule target: Lark Base / Bitable  
Default command: `+dry-run`  
Default profile: `$HOME/.codex/skills/prd-fe-schedule/config/profile.yaml`

## Prerequisite

Before using `+config-schedule`, `+dry-run`, or `+create`, make sure Node.js is available and `lark-cli` is installed, configured, and authorized:

```bash
npm --version
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

If `lark-cli` is missing, the helper script must stop and tell the user to install and configure it first.

## Shortcuts

### Natural Language Scheduling

When the user says something like "schedule these tasks", "帮我按照刚刚拆分 task 的结果排期", or asks to create schedule records from task Markdown:

1. If no schedule profile exists, ask for the Lark Base URL/title and table if needed, then run `+config-schedule`.
2. Show the detected Base fields, available type options, and current record rules.
3. Ask the user how task types should be arranged:
   - which Base type option should be `perTask`
   - which Base type options should be `once`
   - whether any type should be omitted
4. Save the answer with `+config-types`.
5. Run `+dry-run` and show the compact preview summary.
6. Ask whether to execute scheduling with the current settings.
7. Only run `+create` after the user explicitly confirms.

Never create Lark Base records directly from natural language without a dry-run preview and explicit confirmation.

### +config-schedule

Use `+config-schedule` when the user wants to initialize or update the schedule profile for a Lark Base table.

Accepted Codex invocation:

```text
+config-schedule <base-url-or-title> [table-id-or-name] [profile-path]
```

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-schedule.sh" "<base-url-or-title>" "[table-id-or-name]" "[profile-path]"
```

The generated `profile.yaml` must include comments explaining optional fields:

- `title`, `description`, `requirementId`, `status`, `type`, `assignee`, `startDate`, `endDate`, `estimateDays`
- `records[].mode`: `perTask` or `once`
- template variables such as `{{task.title}}`, `{{task.goal}}`, `{{task.changes}}`, `{{task.acceptance}}`, `{{task.dependencies}}`, and `{{requirementId}}`

After generating the profile, show the field mapping and record-rule preview. The user can edit the YAML before running `+dry-run` or `+create`.
Then ask how task types should be arranged before creating records.

### +config-types

Use `+config-types` when the user wants to view, define, or modify the task classification rules remembered in the active schedule profile.

Accepted Codex invocation:

```text
+config-types [--profile <profile.yaml>] [<type-option>:perTask ...] [<type-option>:once ...]
```

Examples:

```text
+config-types
+config-types Development:perTask QA:once Release:once
+config-types --profile ./schedule-profile.yaml Development:perTask QA:once Release:once
```

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-types.sh" "[--profile <profile.yaml>]" "[<type-option>:perTask]" "[<type-option>:once]"
```

If no type rules are provided, show the Base type options and the current profile records without writing the profile. If type rules are provided, validate them against the Base select options, rewrite `records`, and remember the new mode in `profile.yaml`.
After updating type rules, run `+dry-run` before `+create`.

### +dry-run

Use `+dry-run` when the user wants to preview Lark Base schedule records from a frontend task Markdown file.

Accepted Codex invocation:

```text
+dry-run [--profile <profile.yaml>] [--verbose] [--full] <task-md-path-or-name>
```

Examples:

```text
+dry-run docs/frontend-tasks/2026-05-18-pr-00000.md
+dry-run --profile ./schedule-profile.yaml pr-00000
+dry-run --full --profile ./schedule-profile.yaml pr-00000
```

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" "[--profile <profile.yaml>]" "[--verbose]" "[--full]" "<task-md-path-or-name>"
```

Default dry-run output is intentionally compact to reduce Codex token usage. It prints counts, key mappings, pending questions, one record sample, and a local full-preview file path. Use `--verbose` for two samples, or `--full` only when the full table must be printed in the conversation.

### +create

Use `+create` only when the user explicitly asks to create Lark Base records. Always run or show the same preview first. The helper script requires `--yes` for actual writes.
If no dry-run preview has been shown in the current conversation, run `+dry-run` first and ask for confirmation before creating records.

Recommended invocation:

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/create-schedule.sh" --yes "[--profile <profile.yaml>]" "<task-md-path-or-name>"
```

## Workflow

1. Resolve the task Markdown file.
   - If the input is an existing file path, use it directly.
   - Otherwise search the current repo's `docs/frontend-tasks` and, when available, the repo output directory configured by `prd-fe-task`.
   - If multiple matching files exist, stop and ask the user which one to use.

2. Parse frontend tasks.
   - Treat `### Task N: ...` and legacy `#### Task N: ...` headings as task boundaries.
   - Extract task title, `任务目标`, `主要改动点`, `验收点`, and `前置依赖`.
   - If no task blocks are found, stop and ask for a valid Phase 1 task Markdown.

3. Load the YAML profile.
   - Use `--profile <path>` when provided; otherwise use the default profile path.
   - The profile defines Base/table target, field mapping, defaults, and record-generation rules.
   - If the profile is missing, ask the user to run `+config-schedule`.
   - If the user wants to change task categories, run `+config-types` before `+dry-run`.

4. Read Base schema.
   - Use the Base/table from the profile.
   - Re-read fields every run and verify mapped fields still exist and are writable.
   - Select values in the profile must still exist in the target Base; otherwise stop with pending questions.

5. Map fields and print dry-run.
   - Generate records from `records` in the profile.
   - `mode: perTask` creates one record per parsed Markdown task.
   - `mode: once` creates one summary record.
   - Prefer writable fields and avoid formula/lookup fields such as computed task names.
   - If `fields.type` is removed from the profile, do not write task type values.
   - If `defaults.assignee` is `currentUser` and a writable assignee user field exists, default owner to the current `lark-cli` user.
   - Leave start time, completion time, and work days empty unless the profile/template explicitly provides values.
   - Print compact output by default and write the complete Markdown preview to a local temp file.
   - Print unmapped or ambiguous fields under pending questions.
   - `+dry-run` must not call `record-batch-create`, `record-upsert`, or any Lark write command.

## Output Rules

The default dry-run output must include:

- Task Markdown source.
- Target Base token and table.
- Active profile path.
- Parsed task count and preview record count.
- Mapped fields summary.
- One record sample by default, or two with `--verbose`.
- Full preview file path.
- Unmapped fields and pending questions.
- A clear reminder that no Lark data was modified.

The full preview file and `--full` output must include field mapping, record-rule preview, and every generated preview row.

## Safety

- `+dry-run` is read-only against Lark Base.
- `+create` requires explicit user intent and the `--yes` flag.
- If field mapping is uncertain, report the uncertainty instead of inventing values.
- If Base schema cannot be read, stop before producing a fake preview.

## TODO / Roadmap

- Phase 2.1: keep improving profile editing and validation hints.
- Phase 2.3: optionally add JSON preview export for integrations.
