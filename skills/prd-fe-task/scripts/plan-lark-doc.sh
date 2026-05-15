#!/usr/bin/env bash
set -euo pipefail

DOC_INPUT="${1:-}"
REPO_ROOT_ARG="${2:-}"
REPO_ROOT="$(pwd)"
FE_PROJECT_PATHS="<not-configured>"
OUTPUT_DIR="docs/frontend-tasks"
CONFIG_STATUS="missing"
CONFIG_SOURCE="<none>"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_FILE="$SKILL_DIR/config/repos.json"

require_lark_cli() {
  if ! command -v lark-cli >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Error: lark-cli is required but was not found in PATH.

Please install and configure Lark CLI before using prd-fe-task:

  npm install -g @larksuite/cli
  lark-cli config init
  lark-cli auth login --recommend

Official lark-cli documentation:
  https://github.com/larksuite/cli/tree/main

If your organization uses a different installation method, install lark-cli first,
then rerun this command.
EOF
    exit 127
  fi
}

if [[ -z "$DOC_INPUT" ]]; then
  echo "Usage: plan-lark-doc.sh <lark-doc-title-or-url-or-token> [repo-root]" >&2
  exit 2
fi

require_lark_cli

find_config_upwards() {
  local dir="$1"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.lark-fe-task/config.env" ]]; then
      printf '%s\n' "$dir/.lark-fe-task/config.env"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

load_registry_config() {
  if [[ ! -f "$REGISTRY_FILE" || ! -s "$REGISTRY_FILE" ]]; then
    return 1
  fi

  local registry_output
  local registry_status
  set +e
  registry_output="$(/usr/bin/ruby -rjson -rshellwords -e '
    data = JSON.parse(File.read(ARGV[0]))
    repos = data["repos"] || []
    if repos.empty?
      exit 1
    elsif repos.length == 1
      repo = repos.first
      puts "REPO_ROOT=#{Shellwords.escape(repo["repoRoot"])}"
      puts "FE_PROJECT_PATHS=#{Shellwords.escape(Array(repo["feProjectPaths"]).join(","))}"
      puts "OUTPUT_DIR=#{Shellwords.escape(repo["outputDir"] || "docs/frontend-tasks")}"
      puts "CONFIG_STATUS=registry"
      puts "CONFIG_SOURCE=#{Shellwords.escape(ARGV[0])}"
    else
      warn "Multiple prd-fe-task repositories are configured. Choose one and rerun +plan with its repo root:"
      repos.each_with_index do |repo, index|
        warn "#{index + 1}. #{repo["repoRoot"]} | FE_PROJECT_PATHS=#{Array(repo["feProjectPaths"]).join(",")} | OUTPUT_DIR=#{repo["outputDir"]}"
      end
      exit 3
    end
  ' "$REGISTRY_FILE")"
  registry_status=$?
  set -e

  if [[ "$registry_status" -eq 3 ]]; then
    exit 3
  fi
  if [[ "$registry_status" -ne 0 ]]; then
    return 1
  fi

  eval "$registry_output"
}

if [[ -n "$REPO_ROOT_ARG" ]]; then
  REPO_ROOT="$REPO_ROOT_ARG"
  CONFIG_FILE="$REPO_ROOT/.lark-fe-task/config.env"
  if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
    CONFIG_STATUS="loaded"
    CONFIG_SOURCE="$CONFIG_FILE"
  fi
else
  CONFIG_FILE="$(find_config_upwards "$REPO_ROOT" || true)"
  if [[ -n "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
    CONFIG_STATUS="loaded"
    CONFIG_SOURCE="$CONFIG_FILE"
  else
    load_registry_config || true
  fi
fi

is_url_or_token() {
  [[ "$DOC_INPUT" =~ ^https?:// ]] || [[ "$DOC_INPUT" =~ ^[A-Za-z0-9]{20,}$ ]]
}

slugify() {
  local raw="$1"
  local slug
  slug="$(printf '%s' "$raw" | /usr/bin/ruby -EUTF-8 -e '
    raw = STDIN.read
    issue = raw.match(/(?:PR|pr)[-_[:space:]]*([0-9]{3,})/)
    if issue
      puts "pr-#{issue[1]}"
      exit
    end

    slug = raw.downcase
      .gsub(/\[[^\]]*\]/, "")
      .gsub(/[^a-z0-9]+/, "-")
      .gsub(/^-+|-+$/, "")
      .gsub(/-+/, "-")
    puts slug
  ')"
  if [[ -z "$slug" ]]; then
    slug="prd-fe-task"
  fi
  printf '%s' "$slug"
}

ensure_output_gitignore() {
  local repo_root="$1"
  local output_dir="$2"
  local gitignore_file="$repo_root/.gitignore"
  local ignore_path="$output_dir"

  if [[ "$ignore_path" = "$repo_root/"* ]]; then
    ignore_path="${ignore_path#"$repo_root/"}"
  fi

  ignore_path="${ignore_path#/}"
  ignore_path="${ignore_path%/}/"

  if [[ -z "$ignore_path" || "$ignore_path" == "../"* || "$ignore_path" == /* ]]; then
    return 0
  fi

  touch "$gitignore_file"
  if ! grep -Fxq "$ignore_path" "$gitignore_file"; then
    {
      if [[ -s "$gitignore_file" ]]; then
        printf '\n'
      fi
      printf '# prd-fe-task generated task breakdowns\n'
      printf '%s\n' "$ignore_path"
    } >> "$gitignore_file"
  fi
}

DOC_REF="$DOC_INPUT"
TITLE="$DOC_INPUT"

if ! is_url_or_token; then
  SEARCH_JSON="$(lark-cli drive +search --as user --query "$DOC_INPUT" --doc-types docx,doc,wiki --page-size 20 --format json)"
  DOC_REF="$(printf '%s' "$SEARCH_JSON" | /usr/bin/ruby -rjson -e '
    data = JSON.parse(STDIN.read).dig("data", "results") || []
    exact = data.find { |r| (r.dig("title_highlighted") || "").gsub(/<\/?h>/, "").gsub(/<\/?hb>/, "") == ARGV[0] }
    chosen = exact || data.first
    abort("No Lark document found") unless chosen
    puts chosen.dig("result_meta", "url") || chosen.dig("result_meta", "token")
  ' "$DOC_INPUT")"
fi

FETCH_JSON="$(lark-cli docs +fetch --as user --api-version v2 --doc "$DOC_REF" --doc-format markdown)"
CONTENT="$(printf '%s' "$FETCH_JSON" | /usr/bin/ruby -rjson -e 'puts JSON.parse(STDIN.read).dig("data", "document", "content")')"
DOC_TITLE="$(printf '%s' "$CONTENT" | sed -n 's/^<title>\(.*\)<\/title>$/\1/p; s/^# \(.*\)$/\1/p' | sed -n '1p')"

if [[ -n "$DOC_TITLE" ]]; then
  TITLE="$DOC_TITLE"
fi

OUT_DIR="$REPO_ROOT/$OUTPUT_DIR"
OUT_FILE="$OUT_DIR/$(date +%F)-$(slugify "$TITLE").md"
ensure_output_gitignore "$REPO_ROOT" "$OUTPUT_DIR"

cat <<EOF
DOCUMENT_REF=$DOC_REF
REPO_ROOT=$REPO_ROOT
CONFIG_STATUS=$CONFIG_STATUS
CONFIG_SOURCE=$CONFIG_SOURCE
FE_PROJECT_PATHS=$FE_PROJECT_PATHS
OUTPUT_PATH=$OUT_FILE

--- LARK_DOC_MARKDOWN_BEGIN ---
$CONTENT
--- LARK_DOC_MARKDOWN_END ---

Next: choose the affected FE project path from FE_PROJECT_PATHS, inspect it, use references/task-breakdown-template.md, then write the final task breakdown to OUTPUT_PATH.
EOF
