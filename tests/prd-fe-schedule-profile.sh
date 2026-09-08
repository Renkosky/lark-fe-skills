#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="${TMPDIR:-/tmp}/prd-fe-schedule-profile-test"
TASK_MD="$TMP_DIR/2026-05-18-pr-00001.md"
PROFILE_MULTI="$TMP_DIR/multi-type-profile.yaml"
PROFILE_SIMPLE="$TMP_DIR/simple-profile.yaml"
PROFILE_BAD_STATUS="$TMP_DIR/bad-status-profile.yaml"
PROFILE_NO_ONCE="$TMP_DIR/no-once-profile.yaml"
PROFILE_GENERIC="$TMP_DIR/generic-profile.yaml"
PROFILE_GENERIC_UPDATED="$TMP_DIR/generic-profile-updated.yaml"
PROFILE_FALLBACK_TITLE="$TMP_DIR/fallback-title-profile.yaml"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

cat >"$TASK_MD" <<'MD'
# 【PR-00001】示例需求 - Frontend Task Breakdown

## 前端子任务列表

### apps/web

#### Task 1: 增加入口

- 任务目标: 增加页面入口。
- 主要改动点:
  - 增加按钮。
- 验收点:
  - 按钮可见。
- 前置依赖: 无

#### Task 2: 增加弹窗

- 任务目标: 增加填写弹窗。
- 主要改动点:
  - 增加表单。
- 验收点:
  - 校验生效。
- 前置依赖: Task 1

### Task 3: 任务概要格式

- 任务概要:
  - 使用精简任务概要创建排期记录。
  - 待确认: 后端字段是否已就绪。

## 依赖与开发顺序

1. 这部分不应进入最后一个 task 的描述。

## 验收标准

- 这部分也不应进入最后一个 task 的描述。
MD

TABLES_JSON='{"data":{"items":[{"table_id":"tbl_demo","table_name":"Schedule"}]}}'
FIELDS_MULTI_JSON='{"data":{"fields":[
  {"id":"fld_type","name":"Task Type","type":"select","options":[{"name":"Development"},{"name":"QA"},{"name":"Release"},{"name":"UAT"}]},
  {"id":"fld_status","name":"Status","type":"select","options":[{"name":"Todo"},{"name":"In Progress"}]},
  {"id":"fld_title","name":"Task Title","type":"text"},
  {"id":"fld_desc","name":"备注","type":"text"},
  {"id":"fld_req","name":"Requirement ID","type":"text"},
  {"id":"fld_owner","name":"Assignee","type":"user"},
  {"id":"fld_formula","name":"Computed Name","type":"formula"}
]}}'
AUTH_JSON='{"identity":"user","userName":"Demo User","userOpenId":"ou_demo"}'
NESTED_AUTH_JSON='{"identity":"user","identities":{"user":{"status":"ready","openId":"ou_nested","userName":"Nested User"}},"userName":"Nested User"}'

PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-schedule.sh" baseDemoToken000000000 tbl_demo "$PROFILE_MULTI" >/tmp/prd-fe-schedule-config.out

grep -Fq "# 可选字段说明：" "$PROFILE_MULTI"
grep -Fq "# Available type options from Base:" "$PROFILE_MULTI"
grep -Fq "mode: perTask" "$PROFILE_MULTI"
grep -Fq "type: Development" "$PROFILE_MULTI"
if grep -Fq "type: QA" "$PROFILE_MULTI"; then
  echo "Default profile should not create once records before +config-types" >&2
  exit 1
fi

DEFAULT_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_MULTI" "$TASK_MD"
)"

grep -Fq "Preview records: 3" <<<"$DEFAULT_OUTPUT"

# A companion spec must not become an extra scheduling candidate.
cp "$TASK_MD" "${TASK_MD%.md}-implementation-spec.md"
KEYWORD_OUTPUT="$(
  cd "$TMP_DIR"
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_MULTI" "2026-05-18-pr-00001"
)"
grep -Fq "Preview records: 3" <<<"$KEYWORD_OUTPUT"
if "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_MULTI" "${TASK_MD%.md}-implementation-spec.md" >"$TMP_DIR/spec-rejected.out" 2>&1; then
  echo "Implementation specs must not be scheduled directly" >&2
  exit 1
fi
grep -Fq "Use the companion task-summary Markdown" "$TMP_DIR/spec-rejected.out"
grep -Fq "Demo User (ou_demo)" <<<"$DEFAULT_OUTPUT"
grep -Fq "## Next Step" <<<"$DEFAULT_OUTPUT"
grep -Fq "Full preview file:" <<<"$DEFAULT_OUTPUT"
grep -Fq "Do not create records without explicit confirmation." <<<"$DEFAULT_OUTPUT"
if grep -Fq "这部分不应进入最后一个 task 的描述" <<<"$DEFAULT_OUTPUT"; then
  echo "Parent sections should not be included in the final task description" >&2
  exit 1
fi

OVERVIEW_FULL_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --full --profile "$PROFILE_MULTI" "$TASK_MD"
)"
grep -Fq "使用精简任务概要创建排期记录" <<<"$OVERVIEW_FULL_OUTPUT"

NESTED_AUTH_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$NESTED_AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_MULTI" "$TASK_MD"
)"
grep -Fq "Nested User (ou_nested)" <<<"$NESTED_AUTH_OUTPUT"
if grep -Fq "has no user openId" <<<"$NESTED_AUTH_OUTPUT"; then
  echo "Nested auth status should resolve the current user openId" >&2
  exit 1
fi

PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-types.sh" --profile "$PROFILE_MULTI" Development:perTask QA:once Release:once UAT:once >/tmp/prd-fe-schedule-multi-types.out
grep -Fq "Run +dry-run <task-md-path-or-name>" /tmp/prd-fe-schedule-multi-types.out

MULTI_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_MULTI" "$TASK_MD"
)"

grep -Fq "Preview records: 6" <<<"$MULTI_OUTPUT"
grep -Fq "more records hidden. Use --full to print all rows." <<<"$MULTI_OUTPUT"

MULTI_FULL_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --full --profile "$PROFILE_MULTI" "$TASK_MD"
)"
grep -Fq "| qa | once | QA" <<<"$MULTI_FULL_OUTPUT"

cat >"$PROFILE_SIMPLE" <<'YAML'
name: simple
target:
  base: baseDemoToken000000000
  table: tbl_demo
fields:
  title: 标题
  description: 描述
  status: 状态
defaults:
  status: Todo
records:
  - key: development
    mode: perTask
    title: "{{task.title}}"
    description: "{{task.goal}}"
YAML

FIELDS_SIMPLE_JSON='{"data":{"fields":[
  {"id":"fld_title","name":"标题","type":"text"},
  {"id":"fld_desc","name":"描述","type":"text"},
  {"id":"fld_status","name":"状态","type":"select","options":[{"name":"Todo"},{"name":"Done"}]}
]}}'

SIMPLE_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_SIMPLE_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_SIMPLE" "$TASK_MD"
)"

grep -Fq "Preview records: 3" <<<"$SIMPLE_OUTPUT"
if grep -Fq "type |" <<<"$SIMPLE_OUTPUT"; then
  echo "Simple profile should not map or write task type" >&2
  exit 1
fi

cp "$PROFILE_SIMPLE" "$PROFILE_BAD_STATUS"
node -e 'const fs = require("node:fs"); const path = process.argv[1]; fs.writeFileSync(path, fs.readFileSync(path, "utf8").replace("status: Todo", "status: MissingStatus"));' "$PROFILE_BAD_STATUS"
BAD_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_SIMPLE_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_BAD_STATUS" "$TASK_MD"
)"
grep -Fq "Status option does not exist: MissingStatus." <<<"$BAD_OUTPUT"

cat >"$PROFILE_NO_ONCE" <<'YAML'
name: no-once
target:
  base: baseDemoToken000000000
  table: tbl_demo
fields:
  title: Task Title
  description: 备注
  requirementId: Requirement ID
  status: Status
  type: Task Type
  assignee: Assignee
defaults:
  status: Todo
  assignee: currentUser
records:
  - key: development
    mode: perTask
    type: Development
    title: "{{task.title}}"
    description: "{{task.goal}}"
YAML
NO_ONCE_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_MULTI_JSON" \
  PRD_FE_SCHEDULE_AUTH_JSON="$AUTH_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --profile "$PROFILE_NO_ONCE" "$TASK_MD"
)"
grep -Fq "Preview records: 3" <<<"$NO_ONCE_OUTPUT"

FIELDS_GENERIC_JSON='{"data":{"fields":[
  {"id":"fld_type","name":"Task Type","type":"select","options":[{"name":"Development"},{"name":"QA"},{"name":"Release"}]},
  {"id":"fld_status","name":"Status","type":"select","options":[{"name":"Todo"},{"name":"Done"}]},
  {"id":"fld_title","name":"Task Title","type":"text"},
  {"id":"fld_desc","name":"Description","type":"text"}
]}}'

PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_GENERIC_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-schedule.sh" baseDemoToken000000000 tbl_demo "$PROFILE_GENERIC" >/tmp/prd-fe-schedule-generic-config.out

grep -Fq "type: Development" "$PROFILE_GENERIC"
cp "$PROFILE_GENERIC" "$PROFILE_GENERIC_UPDATED"
PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_GENERIC_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-types.sh" --profile "$PROFILE_GENERIC_UPDATED" Development:perTask QA:once Release:once >/tmp/prd-fe-schedule-config-types.out

grep -Fq "type: Development" "$PROFILE_GENERIC_UPDATED"
grep -Fq "type: QA" "$PROFILE_GENERIC_UPDATED"
grep -Fq "type: Release" "$PROFILE_GENERIC_UPDATED"

GENERIC_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_GENERIC_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/dry-run-schedule.sh" --full --profile "$PROFILE_GENERIC_UPDATED" "$TASK_MD"
)"

grep -Fq "Preview records: 5" <<<"$GENERIC_OUTPUT"
grep -Fq "| qa | once | QA" <<<"$GENERIC_OUTPUT"

FIELDS_FALLBACK_TITLE_JSON='{"data":{"fields":[
  {"id":"fld_type","name":"Task Type","type":"select","options":[{"name":"Development"},{"name":"QA"}]},
  {"id":"fld_status","name":"Status","type":"select","options":[{"name":"Todo"}]},
  {"id":"fld_title","name":"Work Item Detail","type":"text"},
  {"id":"fld_desc","name":"Description","type":"text"}
]}}'

PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_FALLBACK_TITLE_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-schedule.sh" baseDemoToken000000000 tbl_demo "$PROFILE_FALLBACK_TITLE" >/tmp/prd-fe-schedule-fallback-title-config.out
grep -Fq 'title: "Work Item Detail"' "$PROFILE_FALLBACK_TITLE"

PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_FALLBACK_TITLE_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-types.sh" --profile "$PROFILE_FALLBACK_TITLE" >/tmp/prd-fe-schedule-fallback-title-types.out
grep -Fq "Question 1: How do you want to arrange task types?" /tmp/prd-fe-schedule-fallback-title-types.out

CONFIG_TYPES_LIST_OUTPUT="$(
  PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
  PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_GENERIC_JSON" \
  "$ROOT_DIR/skills/prd-fe-schedule/scripts/config-types.sh" --profile "$PROFILE_GENERIC_UPDATED"
)"
grep -Fq "## Available Type Options" <<<"$CONFIG_TYPES_LIST_OUTPUT"
grep -Fq -- "- Development" <<<"$CONFIG_TYPES_LIST_OUTPUT"
grep -Fq "Question 1: How do you want to arrange task types?" <<<"$CONFIG_TYPES_LIST_OUTPUT"
grep -Fq "Question 2: After updating the profile" <<<"$CONFIG_TYPES_LIST_OUTPUT"

set +e
PRD_FE_SCHEDULE_TABLES_JSON="$TABLES_JSON" \
PRD_FE_SCHEDULE_FIELDS_JSON="$FIELDS_GENERIC_JSON" \
"$ROOT_DIR/skills/prd-fe-schedule/scripts/config-types.sh" --profile "$PROFILE_GENERIC_UPDATED" MissingType:once >/tmp/prd-fe-schedule-bad-type.out 2>/tmp/prd-fe-schedule-bad-type.err
STATUS=$?
set -e

if [[ "$STATUS" -ne 3 ]]; then
  echo "Expected invalid task type to stop with exit code 3, got $STATUS" >&2
  exit 1
fi
grep -Fq "Unknown task type option" /tmp/prd-fe-schedule-bad-type.err

echo "prd-fe-schedule profile tests passed"
