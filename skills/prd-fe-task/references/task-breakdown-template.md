# Frontend Task Breakdown Template

Use this template for the generated Markdown file. Keep wording concise, but include enough detail for another engineer or agent to implement the tasks directly.

```markdown
# <Document Title> - Frontend Task Breakdown

## 文档信息

- 来源: <actual fetched document title / URL / token>
- 文档ID: <document_id when available>
- 候选选择说明: <why this source was selected when resolved from title/search>
- 生成日期: <YYYY-MM-DD>
- 影响项目: <configured FE project path(s)>
- 需求类型: <feature / optimization / bugfix / onboarding-reference / unknown>

## 需求概览

<Summarize the user-visible or operator-visible requirement in 3-6 bullets. Include the main user flow and business goal.>

If the document contains formulas, examples, or old/new formula comparisons, include the core calculation rules here instead of treating them as missing requirements.

## 影响范围

Only list affected FE project paths, modules, or pages. Do not include rows for projects/modules that are not involved.

| 范围 | 判断依据 |
| --- | --- |
| <fe-project-path> <module/page> | <evidence from doc or repo inspection> |

## 前端子任务列表

### <fe-project-path>

#### Task 1: <Actionable task title>

- 任务目标: <what should be implemented>
- 影响范围: `<fe-project-path module/page>`
- 入口或代码定位线索: <routes/components/services/stores/i18n/tracking clues>
- 主要改动点:
  - <specific UI/state/data change>
  - <specific UI/state/data change>
- 接口/数据/i18n/权限/埋点影响: <API contracts, payloads, translations, auth, permissions, analytics>
- 验收点:
  - <observable acceptance criterion>
  - <observable acceptance criterion>
- 前置依赖: <none or task/API/design dependency>

## 依赖与开发顺序

1. <First task or dependency>
2. <Second task or dependency>
3. <Final verification task>

## 验收标准

- <Cross-task acceptance criterion>
- <Cross-task acceptance criterion>

## 待确认问题

- <Question about ambiguous product behavior, missing API, unclear permissions, or missing design>
```

When the document is not a feature PRD, keep the same headings but mark `需求类型` as `onboarding-reference` or `unknown`, keep the task list short, and explicitly state that no implementation tasks should be invented from reference-only content.

Ignore native App/mobile-only requirements unless they define shared browser FE behavior. The generated breakdown should only cover configured FE project paths.

When the source document includes a `计算公式` section, sample calculation rows, or old/new formula comparisons, preserve the exact business meaning in the relevant task and acceptance criteria. Do not move explicit formulas into `待确认问题` unless the document itself is contradictory.
