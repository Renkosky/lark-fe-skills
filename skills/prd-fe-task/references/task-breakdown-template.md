# Frontend Task Summary Template

Use this compact template for task Markdown that will be turned into Lark schedule records. Keep only the task title and its summary. Do not add code locations, affected apps, API/i18n/tracking matrices, acceptance sections, dependency sections, or a separate question section.

```markdown
# <Document Title>

## 任务列表

### Task 1: <Concise actionable task title>

- 任务概要:
  - <The required UI or operational behavior.>
  - <Important interaction, validation, state, permission, or data rule when applicable.>
  - <Exact calculation formula or example result when the document defines one.>
  - <待确认: only when a required product or backend detail is genuinely missing.>

### Task 2: <Concise actionable task title>

- 任务概要:
  - <Task-specific summary.>
```

Rules:

- Keep Task IDs and titles identical to the companion implementation spec. Store detailed fields, copy and acceptance there; send this summary file to `prd-fe-schedule`.

- Keep each task summary concise enough to fit naturally in a Lark task description.
- Preserve document-defined formulas, examples, validation order, state transitions, and permission rules in the relevant task summary.
- Put unknown details in the relevant task summary as `待确认:`; do not invent behavior.
- Keep `### Task N:` headings exactly so tasks stay visually prominent and `prd-fe-schedule` can parse the file.
- For onboarding or reference-only documents, create no development tasks. State this once under `## 任务列表`.
