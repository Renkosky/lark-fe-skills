# PRD FE Task

English | [中文](#中文)

## English

### Table of Contents

- [Overview](#overview)
- [What It Does](#what-it-does)
- [When to Use](#when-to-use)
- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Configuration](#configuration)
- [List Configured Repositories](#list-configured-repositories)
- [Planning Command](#planning-command)
- [Output](#output)
- [Files](#files)
- [Roadmap](#roadmap)
- [Notes](#notes)

### Overview

`prd-fe-task` turns Lark/Feishu requirements into concise schedule summaries and detailed companion implementation specs from one source reading.

It reads a Lark document by title, URL, or token, extracts the requirement content, inspects the configured frontend project path or paths enough to locate likely implementation areas, and writes a Markdown task plan under the configured output directory.

### What It Does

- Finds and reads Lark/Feishu requirement documents.
- Prefers official PRD documents over same-title test-delivery, QA daily/weekly, or self-test documents.
- Supports one frontend project or multiple frontend projects in a monorepo.
- Treats browser-based public sites, admin consoles, and other web frontends as frontend projects when configured.
- Resolves Web/H5/admin scope from the configured projects; mobile screenshots alone do not imply native-App-only scope.
- Splits requirements into actionable frontend tasks.
- Preserves formulas, sample calculations, and old/new formula comparisons from the PRD.
- Creates concise task titles and summaries suitable for Lark task descriptions.
- Preserves requirement-defined interaction rules, formulas, examples, and genuinely open questions in each task summary.
- Writes the final task summary as a Markdown file.

### When to Use

Use this skill when you have a Lark/Feishu PRD, requirement document, or product spec and want Codex to create concise frontend task summaries for Lark scheduling.

Example prompts:

```text
[$prd-fe-task](path/to/SKILL.md) +plan <Lark document title>
```

```text
Use prd-fe-task to split this Lark PRD into FE tasks: <Lark document URL>
```

### Prerequisites

Install Node.js and configure `lark-cli` before using this skill:

```bash
npm --version
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

Official lark-cli documentation: <https://github.com/larksuite/cli/tree/main>

If `lark-cli` is not installed or not available in `PATH`, the helper scripts will stop and ask you to install it first.

### Usage

Reference the skill in Codex and provide a Lark document title, URL, or token.

Codex will:

1. Locate the document with `lark-cli`.
2. Fetch the document content as Markdown.
3. Choose the affected configured frontend project path.
4. Inspect relevant files under that project path.
5. Generate a compact task summary and a companion implementation spec with matching Task IDs.

### Configuration

Run the config workflow once per repository. In Codex, reference the skill and use `+config`:

```text
[$prd-fe-task](path/to/SKILL.md) +config
```

You can also provide the values directly:

```text
[$prd-fe-task](path/to/SKILL.md) +config <repo-root> <fe-project-paths> [output-dir]
```

If the frontend paths are omitted, Codex should inspect the repository lightly, propose likely frontend project paths, and ask you to confirm before writing config.

The underlying helper command is:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "<repo-root>" "<fe-project-paths>" "docs/frontend-tasks"
```

For a monorepo, pass comma-separated frontend project paths:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "$(pwd)" "apps/web,apps/admin" "docs/frontend-tasks"
```

For a single frontend project repository, use `.`:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "$(pwd)" "." "docs/frontend-tasks"
```

This writes:

```text
<repo-root>/.lark-fe-task/config.env
$HOME/.codex/skills/prd-fe-task/config/repos.json
```

The repository-local config is the source for the current repo. The global registry is an index for listing configured repositories and for fallback selection when `+plan` is run outside a configured repo.

Because repository-local config contains machine-specific paths, `+config` also ensures `.lark-fe-task/` is listed in the repository `.gitignore`.

Both store:

- repository root
- frontend project path or paths
- output directory

### List Configured Repositories

To show all configured repositories, use:

```text
[$prd-fe-task](path/to/SKILL.md) +list
```

The underlying helper command is:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/list-configs.sh"
```

This reads the global registry only. It does not scan your home directory.

### Planning Command

To create a task plan from a Lark document, use:

```text
[$prd-fe-task](path/to/SKILL.md) +plan <Lark document title, URL, or token>
```

The underlying helper command is:

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/plan-lark-doc.sh" "<document-title-or-url-or-token>" "<repo-root>"
```

The command resolves the source document, filters out obvious test-delivery/QA matches when searching by title, fetches the Lark document, and prints:

- the resolved document reference
- the actual fetched document URL and document ID when available
- the document classification and selection note
- configured frontend project paths
- the suggested output path
- the fetched Markdown content

Codex then chooses the affected frontend project path, inspects code, and writes the final plan.

When no repo root is provided, the command first looks for a repository-local config by walking upward from the current directory. If none exists, it reads the global registry. If exactly one repository is registered, it uses that repository; if multiple repositories are registered, Codex should ask which one to use.

### Output

Default output path:

```text
<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>.md
<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>-implementation-spec.md
```

When the document title contains an issue ID such as `PR-00000`, the filename uses only that ID, for example `2026-05-15-pr-00000.md`. If no issue ID exists, it falls back to a short document title slug.

Before writing the Markdown file, the skill ensures the configured output directory is listed in `<repo-root>/.gitignore`, for example `docs/frontend-tasks/`.

The summary contains only `### Task N: ...` and `任务概要` for Lark scheduling. The companion spec contains source/coverage, target paths, progress, field types and formatting, ordered validation, exact copy, formulas, state branches, verified reuse, mock boundaries, acceptance and open questions. Source facts, repository evidence and implementation proposals are labelled separately.

Use the summary with `prd-fe-schedule` and the spec with `prd-fe-implement`. Development defaults to one Task per invocation; explicitly requested batches continue sequentially.

When the PRD includes calculation formulas or examples, the generated tasks should include those rules and expected sample outputs. Explicit formulas should not be moved to open questions unless the source document itself is contradictory.

### Files

```text
prd-fe-task/
├── SKILL.md
├── README.md
├── agents/
│   └── openai.yaml
├── config/
│   └── repos.json
├── references/
│   ├── task-breakdown-template.md
│   └── implementation-spec-template.md
└── scripts/
    ├── config.sh
    ├── list-configs.sh
    └── plan-lark-doc.sh
```

### Roadmap

This skill implements Phase 1: generating frontend task breakdown Markdown from Lark requirement documents.

For the full `lark-fe-skills` project roadmap, see the root README.

### Notes

- `SKILL.md` is the behavior definition used by Codex.
- `README.md` is for human readers and GitHub documentation.
- The helper scripts depend on Node.js and an installed, configured, authorized `lark-cli`.
- Repository-local config is kept in `.lark-fe-task/config.env`; the global `repos.json` is only an index and should not be edited manually.
- This skill plans frontend tasks only; it does not implement code changes.
- If multiple configured frontend paths could match a requirement, Codex should ask which path to use before writing the final task file.

---

## 中文

### 目录

- [概览](#概览)
- [功能](#功能)
- [适用场景](#适用场景)
- [前置条件](#前置条件)
- [使用方式](#使用方式)
- [配置](#配置)
- [查看已配置仓库](#查看已配置仓库)
- [生成计划命令](#生成计划命令)
- [输出结果](#输出结果)
- [文件结构](#文件结构)
- [开发规划](#开发规划)
- [注意事项](#注意事项)

### 概览

`prd-fe-task` 一次读取 Lark/飞书需求，生成用于排期的精简前端任务概要和用于开发的详细规格。

它按标题、链接或 token 读取文档，检查相关代码复用线索，在已配置目录下输出两份 Task 编号一致的 Markdown。

### 功能

- 查找并读取 Lark/飞书需求文档。
- 搜索标题时优先选择正式 PRD，避免误选同名提测、QA 日报/周报或自测文档。
- 支持单前端项目，也支持 monorepo 下多个前端项目。
- 已配置时，前台站点、后台管理端、运营后台等浏览器端项目都可以算前端项目。
- 根据项目确认 Web/H5/后台范围，不单凭移动端截图判断为原生 App 专属需求。
- 将需求拆成适合创建 Lark 任务的精简前端子任务。
- 在每个任务概要中保留 PRD 的计算公式、样例计算、旧/新公式对比，以及必要的交互规则。
- 将真正缺失的信息标注为 `待确认:`，不臆造需求行为。
- 将最终任务概要写成 Markdown 文件。

### 适用场景

当你有 Lark/飞书 PRD、需求文档或产品说明，并希望 Codex 生成用于 Lark 排期的前端任务概要时，使用这个 skill。

示例：

```text
[$prd-fe-task](path/to/SKILL.md) +plan <飞书文档标题>
```

```text
使用 prd-fe-task 把这个飞书 PRD 拆成前端任务：<飞书文档链接>
```

### 前置条件

使用这个 skill 前，需要先准备 Node.js，并安装配置 `lark-cli`：

```bash
npm --version
npm install -g @larksuite/cli
lark-cli config init
lark-cli auth login --recommend
```

官方 lark-cli 文档：<https://github.com/larksuite/cli/tree/main>

如果本地没有安装 `lark-cli`，或者它不在 `PATH` 中，辅助脚本会停止并提示先安装。

### 使用方式

在 Codex 中引用这个 skill，并提供 Lark 文档标题、链接或 token。

Codex 会：

1. 使用 `lark-cli` 定位文档。
2. 将文档内容读取为 Markdown。
3. 将需求整理成任务标题和任务概要。
4. 检查相关代码，生成任务概要及配套开发细则，两者 Task 编号一致。

### 配置

每个仓库先运行一次配置流程。在 Codex 里引用 skill 并使用 `+config`：

```text
[$prd-fe-task](path/to/SKILL.md) +config
```

也可以直接带上配置值：

```text
[$prd-fe-task](path/to/SKILL.md) +config <repo-root> <fe-project-paths> [output-dir]
```

如果没有提供前端项目路径，Codex 应该轻量检查仓库，给出可能的前端项目路径，并在写入配置前让你确认。

底层辅助命令是：

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "<repo-root>" "<fe-project-paths>" "docs/frontend-tasks"
```

monorepo 可以传多个前端项目路径，用英文逗号分隔：

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "$(pwd)" "apps/web,apps/admin" "docs/frontend-tasks"
```

如果仓库本身就是单个前端项目，可以使用 `.`：

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/config.sh" "$(pwd)" "." "docs/frontend-tasks"
```

它会写入：

```text
<repo-root>/.lark-fe-task/config.env
$HOME/.codex/skills/prd-fe-task/config/repos.json
```

仓库内配置用于当前项目；全局 registry 用于查看已经配置过哪些仓库，也用于在 `+plan` 不在已配置仓库内执行时做兜底选择。

因为仓库内配置包含本机路径，`+config` 也会确保 `.lark-fe-task/` 已加入仓库 `.gitignore`。

两处都会记录：

- 仓库根目录
- 前端项目路径
- 输出目录

### 查看已配置仓库

查看所有已配置仓库：

```text
[$prd-fe-task](path/to/SKILL.md) +list
```

底层辅助命令是：

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/list-configs.sh"
```

这个命令只读取全局 registry，不会扫描用户目录。

### 生成计划命令

根据 Lark 文档生成任务拆分：

```text
[$prd-fe-task](path/to/SKILL.md) +plan <飞书文档标题、链接或 token>
```

底层辅助命令是：

```bash
"$HOME/.codex/skills/prd-fe-task/scripts/plan-lark-doc.sh" "<文档标题或链接或token>" "<repo-root>"
```

这个命令会定位源文档，搜索标题时过滤明显的提测/QA 候选，然后读取 Lark 文档，并输出：

- 解析后的文档引用
- 实际拉取的文档 URL 和文档 ID（如果有）
- 文档分类和候选选择说明
- 已配置的前端项目路径
- 建议的输出路径
- 拉取到的 Markdown 原文

随后 Codex 会判断受影响的前端项目路径、检查代码，并写出最终任务拆分文档。

如果没有传 repo root，命令会先从当前目录向上查找仓库内配置；如果没找到，再读取全局 registry。registry 只有一个仓库时会默认使用它；有多个仓库时，Codex 应先询问用户选择哪个仓库。

### 输出结果

默认输出路径：

```text
<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>.md
<repo-root>/<output-dir>/<YYYY-MM-DD>-<requirement-id>-implementation-spec.md
```

当文档标题里包含 `PR-00000` 这类需求编号时，文件名只使用该编号，例如 `2026-05-15-pr-00000.md`。如果没有需求编号，再回退到短标题 slug。

写入 Markdown 前，skill 会确保配置的输出目录已经加入 `<repo-root>/.gitignore`，例如 `docs/frontend-tasks/`。

概要仅包含 `### Task N: ...` 和 `任务概要`，供 Lark 排期使用。配套细则包含来源与覆盖、目标项目、开发进度、字段类型与格式化、校验顺序、完整文案、公式、状态分支、已验证复用、Mock 边界、验收与待确认项，并区分原文事实、代码依据与实现建议。

概要交给 `prd-fe-schedule`，细则交给 `prd-fe-implement`。开发默认一次一个 Task；明确要求批量时按顺序继续。

如果 PRD 包含计算公式或案例，生成任务时应把这些规则和样例结果写入相关任务与验收标准。除非原文互相矛盾，否则明确公式不应被放进待确认问题。

### 文件结构

```text
prd-fe-task/
├── SKILL.md
├── README.md
├── agents/
│   └── openai.yaml
├── config/
│   └── repos.json
├── references/
│   ├── task-breakdown-template.md
│   └── implementation-spec-template.md
└── scripts/
    ├── config.sh
    ├── list-configs.sh
    └── plan-lark-doc.sh
```

### 开发规划

这个 skill 实现 Phase 1：根据 Lark 需求文档生成前端任务拆分 Markdown。

完整的 `lark-fe-skills` 项目路线图请查看根目录 README。

### 注意事项

- `SKILL.md` 是 Codex 使用的行为定义。
- `README.md` 是给人阅读的 GitHub 说明文档。
- 辅助脚本依赖 Node.js，以及已经安装、配置并授权的 `lark-cli`。
- 仓库内配置保存在 `.lark-fe-task/config.env`；全局 `repos.json` 只是索引，不需要手动编辑。
- 这个 skill 只负责拆解前端任务，不负责实现代码改动。
- 如果多个已配置前端路径都可能匹配同一份需求，Codex 应先询问用户选择哪个路径，再写最终任务文件。
