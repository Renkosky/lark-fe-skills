#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/skills/prd-fe-task/scripts/plan-lark-doc.sh"
TMP_DIR="${TMPDIR:-/tmp}/prd-fe-task-resolver-test"
REPO_DIR="$TMP_DIR/repo"

rm -rf "$TMP_DIR"
mkdir -p "$REPO_DIR"

SEARCH_JSON='{
  "data": {
    "results": [
      {
        "entity_type": "WIKI",
        "result_meta": {
          "doc_types": "DOCX",
          "token": "wikiTestDeliveryToken000",
          "url": "https://example.larksuite.com/wiki/wikiTestDeliveryToken000"
        },
        "summary_highlighted": "需求ID | 需求名称：【pr-00001】示例需求\n提测人：demo\n自测情况：通过",
        "title_highlighted": "【<h>pr-00001</h>】示例需求"
      },
      {
        "entity_type": "DOC",
        "result_meta": {
          "doc_types": "DOCX",
          "is_cross_tenant": false,
          "token": "docxRealPrdToken000000",
          "url": "https://example.larksuite.com/docx/docxRealPrdToken000000"
        },
        "summary_highlighted": "",
        "title_highlighted": "【<h>PR-00001</h>】示例需求"
      }
    ]
  }
}'

FETCH_JSON='{
  "data": {
    "document": {
      "document_id": "docxRealPrdToken000000",
      "content": "# 【PR-00001】示例需求\n\n## 一.【需求背景及目标】\n\n目标：增加示例字段。\n\n## 二.【需求详细】\n\n**计算公式**\n\n第一档n=1时，默认参数为0\n\nn档示例参数 = 层级n的下限 * (层级n与层级n-1的比例差值) + 层级n-1的示例参数\n\n新公式，示例结果 = 基础值 * 当前档位比例 - 当前档位参数\n\n案例：第二层级=250，第三层级=4250，第四层级=36250"
    }
  }
}'

OUTPUT="$(
  PRD_FE_TASK_SEARCH_JSON="$SEARCH_JSON" \
  PRD_FE_TASK_FETCH_JSON="$FETCH_JSON" \
  "$SCRIPT" "PR-00001" "$REPO_DIR"
)"

grep -Fq "DOCUMENT_URL=https://example.larksuite.com/docx/docxRealPrdToken000000" <<<"$OUTPUT"
grep -Fq "DOCUMENT_ID=docxRealPrdToken000000" <<<"$OUTPUT"
grep -Fq "DOCUMENT_CLASSIFICATION=prd" <<<"$OUTPUT"
grep -Fq "第一档n=1时，默认参数为0" <<<"$OUTPUT"
grep -Fq "示例结果 = 基础值 * 当前档位比例 - 当前档位参数" <<<"$OUTPUT"
grep -Fq "第二层级=250" <<<"$OUTPUT"

TEST_ONLY_SEARCH_JSON='{
  "data": {
    "results": [
      {
        "entity_type": "WIKI",
        "result_meta": {
          "doc_types": "DOCX",
          "token": "wikiOnlyTestDelivery000",
          "url": "https://example.larksuite.com/wiki/wikiOnlyTestDelivery000"
        },
        "summary_highlighted": "提测人：demo\n自测情况：通过\n环境准备：test",
        "title_highlighted": "【<h>PR-00002</h>】仅提测文档"
      }
    ]
  }
}'

TEST_ONLY_FETCH_JSON='{
  "data": {
    "document": {
      "document_id": "wikiOnlyTestDelivery000",
      "content": "# 【PR-00002】仅提测文档\n\n- 提测人：demo\n- 自测情况：通过\n- 环境准备：test\n- 风险说明："
    }
  }
}'

set +e
PRD_FE_TASK_SEARCH_JSON="$TEST_ONLY_SEARCH_JSON" \
PRD_FE_TASK_FETCH_JSON="$TEST_ONLY_FETCH_JSON" \
"$SCRIPT" "PR-00002" "$REPO_DIR" >/tmp/prd-fe-task-test-only.out 2>/tmp/prd-fe-task-test-only.err
STATUS=$?
set -e

if [[ "$STATUS" -ne 3 ]]; then
  echo "Expected test-only source to stop with exit code 3, got $STATUS" >&2
  exit 1
fi

grep -Fq "No usable PRD document found" /tmp/prd-fe-task-test-only.err

AMBIGUOUS_SEARCH_JSON='{
  "data": {
    "results": [
      {
        "entity_type": "DOC",
        "result_meta": {
          "doc_types": "DOCX",
          "is_cross_tenant": false,
          "token": "docxCandidateOne00000",
          "url": "https://example.larksuite.com/docx/docxCandidateOne00000"
        },
        "summary_highlighted": "",
        "title_highlighted": "【<h>PR-00003</h>】同名需求"
      },
      {
        "entity_type": "DOC",
        "result_meta": {
          "doc_types": "DOCX",
          "is_cross_tenant": false,
          "token": "docxCandidateTwo00000",
          "url": "https://example.larksuite.com/docx/docxCandidateTwo00000"
        },
        "summary_highlighted": "",
        "title_highlighted": "【<h>PR-00003</h>】同名需求"
      }
    ]
  }
}'

set +e
PRD_FE_TASK_SEARCH_JSON="$AMBIGUOUS_SEARCH_JSON" \
PRD_FE_TASK_FETCH_JSON="$FETCH_JSON" \
"$SCRIPT" "PR-00003" "$REPO_DIR" >/tmp/prd-fe-task-ambiguous.out 2>/tmp/prd-fe-task-ambiguous.err
STATUS=$?
set -e

if [[ "$STATUS" -ne 3 ]]; then
  echo "Expected ambiguous source to stop with exit code 3, got $STATUS" >&2
  exit 1
fi

grep -Fq "Multiple similar Lark documents matched" /tmp/prd-fe-task-ambiguous.err

echo "prd-fe-task resolver tests passed"
