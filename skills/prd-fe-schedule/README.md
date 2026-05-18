# PRD FE Schedule

English | [中文](#中文)

## English

## Overview

`prd-fe-schedule` is a Codex skill for turning generated frontend task Markdown into Lark Base schedule records through a local YAML profile.

It is Phase 2 of the PRD-to-FE workflow:

1. `prd-fe-task` reads a Lark/Feishu PRD and generates frontend task Markdown.
2. `prd-fe-schedule` reads that Markdown and a schedule profile, then previews or creates Base records.

The schedule profile defines the target Base/table, field mapping, defaults, and record-generation rules. Different companies or teams can keep different profiles.

## Prerequisites

- Node.js / npm
- Installed, configured, and authorized `lark-cli`
- Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

## Profile Rules

- `profile.yaml` is the main configuration file because YAML supports comments.
- The profile can map optional fields such as `title`, `description`, `requirementId`, `status`, `type`, `assignee`, `startDate`, `endDate`, and `estimateDays`.
- `records[].mode: perTask` creates one record per Markdown task.
- `records[].mode: once` creates one summary record.
- `+config-types` can update `records` from Codex and remember the current task classification mode in the profile.
- `title` and `description` templates support variables such as `{{task.title}}`, `{{task.goal}}`, `{{task.changes}}`, `{{task.acceptance}}`, `{{task.dependencies}}`, and `{{requirementId}}`.
- If `fields.type` is removed, no task type field is written.

## Usage

Create or update a profile:

```text
[$prd-fe-schedule](path/to/SKILL.md) +config-schedule <base-url-or-title> [table-id-or-name] [profile-path]
```

The profile step shows detected fields and available task type options. Decide the scheduling layout before creating records.

View or update task classification rules:

```text
[$prd-fe-schedule](path/to/SKILL.md) +config-types [--profile <profile.yaml>] [<type-option>:perTask] [<type-option>:once]
```

Preview records:

```text
[$prd-fe-schedule](path/to/SKILL.md) +dry-run [--profile <profile.yaml>] <task-md-path-or-name>
```

Create records after preview and confirmation:

```text
[$prd-fe-schedule](path/to/SKILL.md) +create [--profile <profile.yaml>] <task-md-path-or-name>
```

Always preview with `+dry-run` before `+create`.

Underlying helpers:

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-schedule.sh" "<base-url-or-title>" "[table-id-or-name]" "[profile-path]"
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-types.sh" "[--profile <profile.yaml>]" "[<type-option>:perTask]" "[<type-option>:once]"
"$HOME/.codex/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" "[--profile <profile.yaml>]" "<task-md-path-or-name>"
"$HOME/.codex/skills/prd-fe-schedule/scripts/create-schedule.sh" --yes "[--profile <profile.yaml>]" "<task-md-path-or-name>"
```

## Inputs

| Input | Description |
| --- | --- |
| `task-md-path-or-name` | A full Markdown path, or a filename/keyword from `docs/frontend-tasks`. |
| `profile.yaml` | Optional profile path. Defaults to the skill config profile. |

## Output

The dry-run preview includes:

- task Markdown source
- target Base and table
- active profile
- record rule preview
- field mapping table
- preview rows generated from profile rules
- unmapped fields and pending questions
- a safety note that no Lark data was modified

## Safety

- `+dry-run` is read-only.
- `+create` requires explicit user intent and the helper requires `--yes`.
- The skill re-checks Base schema before preview/create.
- It does not write formula, lookup, or system fields.
- Reports uncertain fields instead of inventing values.

## 中文

## 概览

`prd-fe-schedule` 是一个 Codex skill，用于通过本地 YAML profile，把已生成的前端任务 Markdown 转成 Lark Base 排期记录。

它是 PRD 到前端任务工作流的第二阶段：

1. `prd-fe-task` 读取 Lark/飞书 PRD，生成前端任务 Markdown。
2. `prd-fe-schedule` 读取这个 Markdown 和排期 profile，预览或创建 Base 记录。

profile 定义目标 Base/表、字段映射、默认值和记录生成规则。不同公司或团队可以维护不同 profile。

## 前置条件

- Node.js / npm
- 已安装、配置并授权的 `lark-cli`
- 官方 lark-cli 文档：<https://github.com/larksuite/cli/tree/main>

## Profile 规则

- `profile.yaml` 是主要配置文件，因为 YAML 支持注释。
- profile 可以映射 `title`、`description`、`requirementId`、`status`、`type`、`assignee`、`startDate`、`endDate`、`estimateDays` 等可选字段。
- `records[].mode: perTask` 表示每个 Markdown task 创建一条记录。
- `records[].mode: once` 表示创建一条汇总记录。
- `+config-types` 可以在 Codex 中修改 `records`，并把当前任务分类模式记到 profile 里。
- `title` 和 `description` 模板支持 `{{task.title}}`、`{{task.goal}}`、`{{task.changes}}`、`{{task.acceptance}}`、`{{task.dependencies}}`、`{{requirementId}}` 等变量。
- 如果删除 `fields.type`，则不会写入任务类型字段。

## 使用方式

创建或更新 profile：

```text
[$prd-fe-schedule](path/to/SKILL.md) +config-schedule <Base链接或名称> [表ID或表名] [profile路径]
```

profile 阶段会展示识别到的字段和可用任务类型。创建记录前先确定任务类型排期规则。

查看或修改任务分类规则：

```text
[$prd-fe-schedule](path/to/SKILL.md) +config-types [--profile <profile.yaml>] [<类型选项>:perTask] [<类型选项>:once]
```

预览记录：

```text
[$prd-fe-schedule](path/to/SKILL.md) +dry-run [--profile <profile.yaml>] <任务Markdown路径或名称>
```

预览确认后创建记录：

```text
[$prd-fe-schedule](path/to/SKILL.md) +create [--profile <profile.yaml>] <任务Markdown路径或名称>
```

执行 `+create` 前应先通过 `+dry-run` 预览。

底层 helper：

```bash
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-schedule.sh" "<Base链接或名称>" "[表ID或表名]" "[profile路径]"
"$HOME/.codex/skills/prd-fe-schedule/scripts/config-types.sh" "[--profile <profile.yaml>]" "[<类型选项>:perTask]" "[<类型选项>:once]"
"$HOME/.codex/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" "[--profile <profile.yaml>]" "<任务Markdown路径或名称>"
"$HOME/.codex/skills/prd-fe-schedule/scripts/create-schedule.sh" --yes "[--profile <profile.yaml>]" "<任务Markdown路径或名称>"
```

## 输入

| 输入 | 说明 |
| --- | --- |
| `任务Markdown路径或名称` | 完整 Markdown 路径，或 `docs/frontend-tasks` 下的文件名/关键词。 |
| `profile.yaml` | 可选 profile 路径，默认使用 skill config profile。 |

## 输出

dry-run 预览包含：

- 任务 Markdown 来源
- 目标 Base 和数据表
- 当前 profile
- 记录生成规则预览
- 字段映射表
- 按 profile 规则生成的预览记录
- 未映射字段和待确认问题
- 未修改 Lark 数据的安全提示

## 安全规则

- `+dry-run` 只读。
- `+create` 必须由用户明确要求，底层 helper 也要求 `--yes`。
- 每次预览/创建前都会重新检查 Base schema。
- 不写 formula、lookup 或系统字段。
- 字段不确定时只报告问题，不臆造。
