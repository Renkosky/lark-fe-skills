# Implementation Specification Template

Read this when generating the companion implementation spec. Adapt sections to the task; omit inapplicable sections. Do not fill unknown contracts with guessed values. The spec should let a developer implement the requested scope without rereading the entire PRD.

```markdown
# <Document Title> - Implementation Spec

## 来源与范围

- 来源: <actual fetched URL, document ID, revision if returned, read date>
- 读取范围: <whole PRD or named sections and required references>
- 任务概要: [<same-basename>.md](./<same-basename>.md)
- 目标项目: <confirmed relative frontend paths>
- 不包含: <confirmed exclusions, if any>

## 需求覆盖

| 原文章节/表格/原型 | Task ID | 已提取规则或未读取内容 |
| --- | --- | --- |
| <source locator> | Task 1 | <fields, validation, copy, examples or specific gap> |

## 开发进度

| Task | 状态 | 验证/Mock/阻塞 |
| --- | --- | --- |
| Task 1 | 未开始 | <dependencies or none> |

### Task 1: <Same title as schedule summary>

#### 目标与依赖

<User outcome, entrypoint, required previous tasks, source section.>

#### 需求行为与界面文案

<Controls, defaults, visibility, permissions, routes, exact labels/placeholders/tooltips/modal copy, button outcomes. Include source locators for rules.>

#### 字段与数据规则

| 字段/含义 | 控件 | 数据类型与依据 | 数据来源/默认值 | 展示/精度/舍入/单位 | 校验时机与顺序 | 提交转换 |
| --- | --- | --- | --- | --- | --- | --- |
| <label> | <input/select/display> | <verified DTO type or explicitly proposed UI type> | <source or unknown> | <exact source rule or unknown> | <input/blur/submit, ordered rule IDs> | <verified conversion or pending contract> |

#### 校验与状态流转

<Ordered steps with trigger, condition, success and failure outcomes. Include loading, duplicate submission, empty data, cancellation, switching/reset behavior where defined. Label proposed behavior separately.>

#### 公式与示例

<Preserve exact formulas, units, thresholds, old/new distinction, source sample inputs and expected results. Flag contradictions; do not silently correct them.>

#### 代码复用与接口/Mock

- 已验证复用: <relative file paths and existing components/hooks/contracts; or not found>
- 接口契约: <verified method/fields/enums or explicitly unknown; no invented backend endpoints>
- Mock: <only missing data/branches, location and activation convention; do not override working real data>

#### 验收

- [ ] <Observable behavior with inputs and expected outcomes, including boundary/error cases.>

#### 待确认

- <Specific missing/contradictory fact, source, affected behavior and whether it blocks this task.>
```

Requirements for extraction:

- Distinguish PRD facts, verified repository facts, proposed implementation choices, and unknowns. Suggested names like `amountInput` are not API contracts. Never invent a backend field such as `freezeReason` just because it might be useful.
- For numeric fields retain allowed sign, precision, min/max inclusivity, empty/null/zero semantics, formatting versus submitted value, rounding and units when specified. If absent, mark the missing rule; recommend decimal handling only as a proposal consistent with the repo.
- Preserve full product copy, formulas and source examples. A link alone does not replace a readable rule; link diagrams with a description of the relevant behavior. Do not turn explicit source rules into questions.
- Keep server-owned actions server-owned. A PRD describing deductions or transfers does not authorize frontend code to orchestrate separate financial writes.
- Avoid guessed status enums and fabricated state machines. Distinguish UI request states from documented business statuses.
- Keep summaries small by storing detailed rules here. Use targeted source retrieval only for missing references; avoid dumping the full PRD repeatedly into conversation.

中文：细则必须覆盖字段类型、来源、默认值、格式与精度、校验触发及顺序、提交转换、完整文案、状态分支、公式案例、复用线索、Mock 边界与验收。原文事实、代码事实、实现建议、待确认内容必须可区分；同一 Task 与排期概要编号一致。
