# Lark FE Skills

[![npm version](https://img.shields.io/npm/v/@renkosky/lark-fe-skills.svg)](https://www.npmjs.com/package/@renkosky/lark-fe-skills) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) [![Codex Skills](https://img.shields.io/badge/Codex-Skills-111827.svg)](https://github.com/openai/codex) [![Lark CLI](https://img.shields.io/badge/Lark-CLI-00A6FF.svg)](https://github.com/larksuite/cli/tree/main)

English | [中文](#中文)

Lark/Feishu based Codex skills for frontend requirement planning.

[Install](#install) · [Prerequisites](#prerequisites) · [CLI](#cli) · [Roadmap](#roadmap) · [中文](#中文)

## English

## ✨ What is this?

`@renkosky/lark-fe-skills` packages Codex skills for Lark-based frontend workflows.

The workflow includes `prd-fe-task` for task summaries and implementation specs, `prd-fe-schedule` for Lark Base schedules, and `prd-fe-implement` for frontend development.

## 🚀 Install

1. Install the package:

```bash
npm install -g @renkosky/lark-fe-skills
```

2. Install the Codex skills:

```bash
lark-fe-skills install
```

3. Restart Codex or open a new Codex session.

PATH fallback:

```bash
npm exec --package=@renkosky/lark-fe-skills -- lark-fe-skills install
```

Use it in Codex:

```text
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +config
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +plan <Lark document title, URL, or token>
[$prd-fe-implement](~/.codex/skills/prd-fe-implement/SKILL.md) Implement Task 1 from <implementation-spec.md>
```

## 🧰 Prerequisites

Install Node.js and configure `lark-cli` first:

```bash
npm --version
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

## 🖥️ CLI

```bash
lark-fe-skills list
lark-fe-skills path
lark-fe-skills path <skill-name>
lark-fe-skills install
lark-fe-skills install <skill-name>
lark-fe-skills update
lark-fe-skills uninstall
lark-fe-skills uninstall <skill-name>
lark-fe-skills uninstall lark-fe-task
```

## 📦 Packaged Skills

| Skill | Description |
| --- | --- |
| `prd-fe-task` | Generate compact schedule tasks and a detailed companion implementation spec. |
| `prd-fe-schedule` | Preview Lark Base schedule records from generated frontend task Markdown. |
| `prd-fe-implement` | Implement tasks sequentially with code reuse, scoped mocks and verification. |

`+plan` generates `<date>-<issue-id>.md` for scheduling and `<date>-<issue-id>-implementation-spec.md` for development, with matching Task IDs. The spec preserves field types, formatting, validation order, copy, formulas and failure branches, and separates source facts from implementation proposals. Send only the summary to scheduling.

## 📝 Notes

- npm installation and Codex skill installation are separate steps.
- This package installs skills to `~/.codex/skills`.
- Use `lark-fe-skills update` to update the npm package to latest and reinstall packaged Codex skills.
- Use `lark-fe-skills uninstall` to reset local Codex skill installation for first-run testing.
- Use `lark-fe-skills uninstall lark-fe-task` to remove the legacy install directory.
- Existing Lark skills may live under `~/.agents/skills`; that is a different source.

## 🗺️ Roadmap

- [x] Phase 1: Generate frontend task breakdown Markdown from Lark requirement documents.
  - [x] Configure repository root, frontend project paths, and output directory.
  - [x] List configured repositories from the global registry.
  - [x] Fetch Lark requirement documents by title, URL, or token.
  - [x] Inspect configured frontend project paths lightly for code-location clues.
  - [x] Generate ignored Markdown task files under the configured output directory.
- [ ] Phase 2: Create Lark schedule tasks from generated frontend task Markdown.
  - [x] Add `prd-fe-schedule` dry-run skill.
  - [x] Add YAML schedule profiles with comments for configurable fields, defaults, and record rules.
  - [x] Accept a Lark schedule Base URL or title, then read its table schema before generating a profile.
  - [x] Map Markdown tasks into schedule fields using profile rules instead of hard-coded company task types.
  - [x] Configure and remember task classification rules with `+config-types`.
  - [x] Read custom task status/type options from the Base instead of inventing tags.
  - [x] Support dry-run previews from a profile without modifying Lark.
  - [x] Reduce token usage by printing compact dry-run summaries and writing full previews to local temp files.
  - [x] Add an explicit `+create` helper that requires confirmation/`--yes` before writing records.
- [x] Phase 3: Add `prd-fe-implement` instructions for frontend development from implementation specs.
  - [x] Generate a companion spec with fields, validation, formulas, copy and traceable source coverage.
  - [x] Default to one Task per run; continue sequentially for explicitly requested batches.
  - [x] Reuse existing code and data; mock unavailable behavior without replacing working responses.
  - [x] Track progress, validation, mocks and blockers in the spec.
  - [ ] Validate the complete workflow against a real development task.
- [ ] Phase 4: Backend integration and API handoff workflow.
  - [ ] Treat this phase as TBD until the backend handoff format is standardized.
  - [ ] Expected direction: use Lark as the API handoff and collaboration surface.
  - [ ] Before implementation, align with backend engineers on the required document format, including endpoint, method, request params, response schema, error codes, mock examples, and owner.
  - [ ] After the format is confirmed, extend this skill to read the API handoff document and update frontend tasks or implementation notes accordingly.

## 中文

[安装](#安装) · [前置条件](#前置条件) · [CLI](#cli-1) · [开发规划](#开发规划) · [English](#english)

## ✨ 这是什么？

`@renkosky/lark-fe-skills` 用于分发基于 Lark/飞书的前端需求工作流 Codex skills。

工作流包含 `prd-fe-task`（任务概要与开发细则）、`prd-fe-schedule`（Lark Base 排期）和 `prd-fe-implement`（实际前端开发）。

## 🚀 安装

1. 安装 npm 包：

```bash
npm install -g @renkosky/lark-fe-skills
```

2. 安装 Codex skills：

```bash
lark-fe-skills install
```

3. 重启 Codex 或新开一个 Codex 会话。

PATH fallback：

```bash
npm exec --package=@renkosky/lark-fe-skills -- lark-fe-skills install
```

在 Codex 中使用：

```text
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +config
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +plan <飞书文档标题、链接或 token>
[$prd-fe-implement](~/.codex/skills/prd-fe-implement/SKILL.md) 实现 <implementation-spec.md> 的 Task 1
```

## 🧰 前置条件

先准备 Node.js，并安装配置 `lark-cli`：

```bash
npm --version
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

官方 lark-cli 文档：<https://github.com/larksuite/cli/tree/main>

## 🖥️ CLI

```bash
lark-fe-skills list
lark-fe-skills path
lark-fe-skills path <skill-name>
lark-fe-skills install
lark-fe-skills install <skill-name>
lark-fe-skills update
lark-fe-skills uninstall
lark-fe-skills uninstall <skill-name>
lark-fe-skills uninstall lark-fe-task
```

## 📦 已包含 Skills

| Skill | 说明 |
| --- | --- |
| `prd-fe-task` | 生成精简排期任务概要和配套开发细则。 |
| `prd-fe-schedule` | 根据前端任务 Markdown 预览 Lark Base 排期记录。 |
| `prd-fe-implement` | 逐项开发，复用代码、按需 Mock 并验证。 |

`+plan` 同时生成用于排期的 `<日期>-<需求编号>.md` 和用于开发的 `<日期>-<需求编号>-implementation-spec.md`，两者 Task 编号一致。细则保留字段类型、格式化、校验顺序、完整文案、公式和异常分支，并区分原文事实与实现建议。排期只传概要文件。

## 📝 说明

- npm 包安装和 Codex skill 安装是两步。
- 本包默认安装到 `~/.codex/skills`。
- 可以用 `lark-fe-skills update` 更新 npm 包到 latest，并重新安装包内 Codex skills。
- 可以用 `lark-fe-skills uninstall` 清理本地 Codex skills，方便测试首次安装流程。
- 可以用 `lark-fe-skills uninstall lark-fe-task` 清理旧版安装目录。
- 已有 Lark skills 可能位于 `~/.agents/skills`，这是另一类来源。

## 🗺️ 开发规划

- [x] Phase 1：根据 Lark 需求文档生成前端任务拆分 Markdown。
  - [x] 配置仓库根目录、前端项目路径和输出目录。
  - [x] 从全局 registry 查看已配置仓库。
  - [x] 支持通过标题、链接或 token 读取 Lark 需求文档。
  - [x] 轻量检查已配置前端项目路径，补充代码定位线索。
  - [x] 在已配置输出目录下生成被 git 忽略的 Markdown 任务文件。
- [ ] Phase 2：把已生成的前端任务 Markdown 转成 Lark 排期任务。
  - [x] 新增 `prd-fe-schedule` dry-run skill。
  - [x] 新增带注释的 YAML schedule profile，用于配置字段、默认值和记录生成规则。
  - [x] 支持用户提供 Lark 排期 Base 链接或名称，并在生成 profile 前读取表结构。
  - [x] 根据 profile 规则映射 Markdown 任务，不再写死某家公司任务类型。
  - [x] 支持通过 `+config-types` 配置并记住任务分类规则。
  - [x] 从 Base 读取自定义任务状态/类型选项，不臆造 tag。
  - [x] 支持基于 profile 的 dry-run 预览，不修改 Lark。
  - [x] 默认输出精简 dry-run 摘要，并把完整预览写入本地临时文件，降低 token 消耗。
  - [x] 新增显式 `+create` helper，要求确认/`--yes` 后才写入记录。
- [x] Phase 3：新增 `prd-fe-implement`，定义基于开发细则的前端实现流程。
  - [x] 生成配套细则，覆盖字段、校验、公式、文案和来源追溯。
  - [x] 默认一次一个 Task；明确要求批量时按顺序持续执行。
  - [x] 复用现有代码与数据；未就绪行为使用 Mock，不覆盖可用真实数据。
  - [x] 在细则中记录进度、验证、Mock 和阻塞。
  - [ ] 用真实开发任务验证完整流程。
- [ ] Phase 4：接口对接与后端交付文档工作流。
  - [ ] 这部分在后端接口交付格式统一前保持待定。
  - [ ] 预期方向：继续使用 Lark 作为接口交付和协作载体。
  - [ ] 实施前需要先和后端约定文档格式，包括接口地址、请求方法、请求参数、响应结构、错误码、mock 示例和负责人。
  - [ ] 格式确认后，再扩展 skill 读取接口交付文档，并同步更新前端任务或开发说明。
