# Lark FE Skills

[![npm version](https://img.shields.io/npm/v/@renkosky/lark-fe-skills.svg)](https://www.npmjs.com/package/@renkosky/lark-fe-skills) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) [![Codex Skills](https://img.shields.io/badge/Codex-Skills-111827.svg)](https://github.com/openai/codex) [![Lark CLI](https://img.shields.io/badge/Lark-CLI-00A6FF.svg)](https://github.com/larksuite/cli/tree/main)

English | [中文](#中文)

Lark/Feishu based Codex skills for frontend requirement planning.

[Install](#install) · [Prerequisites](#prerequisites) · [CLI](#cli) · [Roadmap](#roadmap) · [中文](#中文)

## English

## ✨ What is this?

`@renkosky/lark-fe-skills` packages Codex skills for Lark-based frontend workflows.

The first skill is `prd-fe-task`: read a Lark/Feishu requirement document, inspect configured frontend project paths, and generate a task breakdown Markdown file.

## 🚀 Install

1. Install the package:

```bash
npm install -g @renkosky/lark-fe-skills
```

2. Install the skill:

```bash
lark-fe-skills install prd-fe-task
```

3. Restart Codex or open a new Codex session.

PATH fallback:

```bash
npm exec --package=@renkosky/lark-fe-skills -- lark-fe-skills install prd-fe-task
```

Use it in Codex:

```text
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +config
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +plan <Lark document title, URL, or token>
```

## 🧰 Prerequisites

Install and configure `lark-cli` first:

```bash
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

## 🖥️ CLI

```bash
lark-fe-skills list
lark-fe-skills path
lark-fe-skills path prd-fe-task
lark-fe-skills install prd-fe-task
lark-fe-skills uninstall prd-fe-task
lark-fe-skills uninstall lark-fe-task
```

## 📦 Packaged Skills

| Skill | Description |
| --- | --- |
| `prd-fe-task` | Turn Lark/Feishu requirement documents into concrete frontend task breakdowns. |

## 📝 Notes

- npm installation and Codex skill installation are separate steps.
- This package installs skills to `~/.codex/skills`.
- Use `lark-fe-skills uninstall prd-fe-task` to reset local Codex skill installation for first-run testing.
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
  - [ ] Accept a Lark schedule Base URL or title, then read its table schema before mapping fields.
  - [ ] Map Markdown tasks into schedule fields such as task name, task description, task status, start time, and end time.
  - [ ] Read custom task status options from the Base instead of inventing status tags.
  - [ ] First version should be dry-run only and show the records that would be created without modifying Lark.
  - [ ] A later version can add user confirmation and then create records in the schedule Base.
- [ ] Phase 3: Implement frontend tasks from generated Markdown.
  - [ ] Default to implementing one task at a time to keep human review small and manageable.
  - [ ] After each task, stop and report changed files, verification results, remaining tasks, mocks used, and unresolved questions.
  - [ ] Continue to the next task only when the user explicitly asks to continue, or when the user explicitly requests multiple tasks in one batch.
  - [ ] If one task is too large, split it into smaller implementation batches before editing code.
  - [ ] Reuse existing project APIs, hooks, stores, components, permissions, i18n, and mock patterns before adding new code.
  - [ ] Do not perform real backend integration in this phase; use existing reusable data or the project's mock system when API behavior is unavailable.
  - [ ] Ask the user when required API fields, permission keys, status enums, or core product behavior cannot be found in the codebase.
  - [ ] Keep changes scoped to the affected project paths and modules from the task Markdown.
  - [ ] Verify each completed task with the most relevant available static checks, and clearly report any unrelated existing failures.
- [ ] Phase 4: Backend integration and API handoff workflow.
  - [ ] Treat this phase as TBD until the backend handoff format is standardized.
  - [ ] Expected direction: use Lark as the API handoff and collaboration surface.
  - [ ] Before implementation, align with backend engineers on the required document format, including endpoint, method, request params, response schema, error codes, mock examples, and owner.
  - [ ] After the format is confirmed, extend this skill to read the API handoff document and update frontend tasks or implementation notes accordingly.

## 中文

[安装](#安装) · [前置条件](#前置条件) · [CLI](#cli-1) · [开发规划](#开发规划) · [English](#english)

## ✨ 这是什么？

`@renkosky/lark-fe-skills` 用于分发基于 Lark/飞书的前端需求工作流 Codex skills。

首个 skill 是 `prd-fe-task`：读取 Lark/飞书需求文档，轻量检查已配置的前端项目路径，并生成前端任务拆分 Markdown。

## 🚀 安装

1. 安装 npm 包：

```bash
npm install -g @renkosky/lark-fe-skills
```

2. 安装 skill：

```bash
lark-fe-skills install prd-fe-task
```

3. 重启 Codex 或新开一个 Codex 会话。

PATH fallback：

```bash
npm exec --package=@renkosky/lark-fe-skills -- lark-fe-skills install prd-fe-task
```

在 Codex 中使用：

```text
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +config
[$prd-fe-task](~/.codex/skills/prd-fe-task/SKILL.md) +plan <飞书文档标题、链接或 token>
```

## 🧰 前置条件

先安装并配置 `lark-cli`：

```bash
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

官方 lark-cli 文档：<https://github.com/larksuite/cli/tree/main>

## 🖥️ CLI

```bash
lark-fe-skills list
lark-fe-skills path
lark-fe-skills path prd-fe-task
lark-fe-skills install prd-fe-task
lark-fe-skills uninstall prd-fe-task
lark-fe-skills uninstall lark-fe-task
```

## 📦 已包含 Skills

| Skill | 说明 |
| --- | --- |
| `prd-fe-task` | 将 Lark/飞书需求文档拆解成可开发的前端任务。 |

## 📝 说明

- npm 包安装和 Codex skill 安装是两步。
- 本包默认安装到 `~/.codex/skills`。
- 可以用 `lark-fe-skills uninstall prd-fe-task` 清理本地 Codex skill，方便测试首次安装流程。
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
  - [ ] 支持用户提供 Lark 排期 Base 链接或名称，并在映射字段前读取表结构。
  - [ ] 将 Markdown 任务映射到任务名称、任务描述、任务状态、开始时间、结束时间等排期字段。
  - [ ] 从 Base 读取自定义任务状态选项，不臆造状态 tag。
  - [ ] 第一版只做 dry-run 预览，展示将要创建的记录，不修改 Lark。
  - [ ] 后续版本再增加用户确认步骤，并在确认后写入排期 Base。
- [ ] Phase 3：根据已生成的 Markdown 实际开发前端任务。
  - [ ] 默认一次只实现一个 Task，控制代码改动粒度，方便人工 review。
  - [ ] 每完成一个 Task 就暂停，并汇报改动文件、验证结果、剩余任务、使用的 mock 和未解决问题。
  - [ ] 只有用户明确要求继续，或明确要求一次实现多个任务时，才继续处理后续 Task。
  - [ ] 如果单个 Task 本身过大，先拆成更小的实现批次再改代码。
  - [ ] 优先复用项目里已有的接口、hooks、stores、组件、权限、i18n 和 mock 模式，再考虑新增实现。
  - [ ] 这一阶段不做真实后端联调；接口行为不可用时，优先使用已有可复用数据或项目 mock 体系。
  - [ ] 如果 API 字段、权限 key、状态枚举或核心产品行为在代码里找不到，要先询问用户，不臆造。
  - [ ] 代码改动只限制在任务 Markdown 标出的受影响项目路径和模块内。
  - [ ] 每完成一个 Task 后运行最相关的静态检查，并明确说明是否存在无关历史失败。
- [ ] Phase 4：接口联调与后端交付文档工作流。
  - [ ] 这部分在后端接口交付格式统一前保持待定。
  - [ ] 预期方向：继续使用 Lark 作为接口交付和协作载体。
  - [ ] 实施前需要先和后端约定文档格式，包括接口地址、请求方法、请求参数、响应结构、错误码、mock 示例和负责人。
  - [ ] 格式确认后，再扩展 skill 读取接口交付文档，并同步更新前端任务或开发说明。
