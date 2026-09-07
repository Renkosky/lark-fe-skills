---
name: prd-fe-implement
description: Implement frontend tasks from a companion implementation-spec Markdown, reusing repository code and mocking unavailable API behavior. Use when asked to develop a planned frontend task or continue implementation; supports one task or an explicitly requested batch.
---

# PRD FE Implement

## Inputs

Accept an implementation spec path, its companion task-summary path/name, or the recently generated artifacts in this conversation. Use repository-local configuration and the spec's target paths; support both single-project repositories and monorepos. Never search the entire home directory for tasks.

Codex invocation examples (agent instructions, not shell commands):

```text
$prd-fe-implement 实现 <implementation-spec.md> 的 Task 1
$prd-fe-implement 按刚刚的任务细则开始开发
$prd-fe-implement 继续下一个 Task
$prd-fe-implement 完成这份细则里的全部任务
```

If given a summary, resolve `<summary-basename>-implementation-spec.md` beside it. If no detailed spec exists, use `prd-fe-task` when available to prepare it from the known source before implementation. If the source is missing, request it instead of treating a short schedule summary as a complete specification. A readable local spec does not require Lark login.

## Workflow

1. Read repository instructions, the spec's scope/coverage/progress, and the requested Task. Resolve ambiguous target projects before editing. Check the working tree and preserve existing work.
2. Select the requested task, otherwise the next unfinished task whose dependencies are satisfied. Default to one Task per invocation, then hand back for review. Explicit requests for multiple or all tasks authorize sequential implementation within that batch without per-task approval. Split unusually large tasks into reviewable increments and verify each increment.
3. Inspect the actual entrypoint and nearby components, hooks, services, types, stores, permissions, localization, formatting and mocks before adding code. Verify spec paths and contracts against current code; do not trust stale suggestions as facts.
4. Implement the task's field rules, exact copy, validation order, state branches and acceptance criteria. Follow repository conventions and the scope in the spec. Use targeted Lark rereads only for identified gaps, contradictions or requested source updates, not a full PRD fetch per Task.
5. Reuse working APIs/data when available. For unavailable backend behavior, use the repository's existing mock boundary and explicit development/test activation; keep real nonempty responses intact. Label mock contracts as provisional. Do not invent production endpoints, permission keys or business enums. Ask about missing behavior that affects correctness while continuing independent unblocked work.
6. Run the relevant formatter and focused checks. Exercise UI flows in the available local browser/test environment when feasible, covering field validation, switching/reset, loading and failure branches. Report unavailable verification explicitly; static checks alone do not prove UI acceptance or backend integration.
7. Update the existing spec's progress row for the task with changed paths, checks, remaining mocks and blockers. Record partial work as partial. A task may be frontend-complete with mocks, but must not be labelled backend-integrated. Preserve source requirements and human edits; do not write implementation progress into the schedule summary.
8. Report completed Task IDs, a concise change summary, validation evidence, remaining mocks/questions, and the next task. Stop at the authorized batch boundary. If blocked, state the exact missing fact and remaining work.

## Boundaries

- Phase 3 implements frontend behavior with verified reuse and mock support. New live backend integration belongs to Phase 4 unless the user explicitly changes scope.
- Do not create Lark schedule records, commit, push, publish or deploy from an implementation request alone.
- Do not infer deduction, approval or transfer API sequences from a UI description; follow verified server contracts.
- Lark tools are optional for a complete local spec. When source retrieval is needed, use available `lark-doc` instructions and `lark-cli`; missing setup guidance: https://github.com/larksuite/cli/tree/main.

## 中文要点

从开发细则逐项完成前端需求，默认一次一个 Task，完成后汇报供人工 review；明确要求批量或全部完成时按依赖顺序持续执行。先查现有组件、接口和数据，缺失接口使用项目 Mock 机制，并标明临时契约。只对细则缺失内容定向回查 Lark。每项验证后更新细则中的进度、Mock 和阻塞，区分前端完成与接口已联调。
