#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-}"
FE_PROJECT_PATHS="${2:-}"
OUTPUT_DIR="${3:-docs/frontend-tasks}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_DIR="$SKILL_DIR/config"
REGISTRY_FILE="$REGISTRY_DIR/repos.json"

require_lark_cli() {
  if ! command -v lark-cli >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Error: lark-cli is required but was not found in PATH.

Please install and configure Lark CLI before using lark-fe-task:

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

ensure_local_config_gitignore() {
  local repo_root="$1"
  local gitignore_file="$repo_root/.gitignore"
  local ignore_path=".lark-fe-task/"

  touch "$gitignore_file"
  if ! grep -Fxq "$ignore_path" "$gitignore_file"; then
    {
      if [[ -s "$gitignore_file" ]]; then
        printf '\n'
      fi
      printf '# lark-fe-task local config\n'
      printf '%s\n' "$ignore_path"
    } >> "$gitignore_file"
  fi
}

if [[ -z "$REPO_ROOT" || -z "$FE_PROJECT_PATHS" ]]; then
  echo "Usage: config.sh <repo-root> <fe-project-paths-comma-separated> [output-dir]" >&2
  exit 2
fi

require_lark_cli

if [[ ! -d "$REPO_ROOT" ]]; then
  echo "Repo root does not exist: $REPO_ROOT" >&2
  exit 1
fi

IFS=',' read -r -a FE_PATH_ARRAY <<< "$FE_PROJECT_PATHS"
for fe_path in "${FE_PATH_ARRAY[@]}"; do
  if [[ -z "$fe_path" ]]; then
    echo "FE project path list contains an empty entry" >&2
    exit 1
  fi
  if [[ ! -d "$REPO_ROOT/$fe_path" ]]; then
    echo "FE project path does not exist: $REPO_ROOT/$fe_path" >&2
    exit 1
  fi
done

CONFIG_DIR="$REPO_ROOT/.lark-fe-task"
CONFIG_FILE="$CONFIG_DIR/config.env"
mkdir -p "$CONFIG_DIR"
mkdir -p "$REGISTRY_DIR"

{
  printf 'REPO_ROOT=%q\n' "$REPO_ROOT"
  printf 'FE_PROJECT_PATHS=%q\n' "$FE_PROJECT_PATHS"
  printf 'OUTPUT_DIR=%q\n' "$OUTPUT_DIR"
} > "$CONFIG_FILE"
ensure_local_config_gitignore "$REPO_ROOT"

/usr/bin/ruby -rjson -rfileutils -rtime -e '
  registry_file, repo_root, fe_project_paths, output_dir = ARGV
  now = Time.now.utc.iso8601
  data =
    if File.exist?(registry_file) && !File.read(registry_file).strip.empty?
      JSON.parse(File.read(registry_file))
    else
      { "version" => 1, "repos" => [] }
    end
  data["version"] ||= 1
  data["repos"] ||= []
  entry = {
    "repoRoot" => repo_root,
    "feProjectPaths" => fe_project_paths.split(","),
    "outputDir" => output_dir,
    "updatedAt" => now
  }
  index = data["repos"].find_index { |repo| repo["repoRoot"] == repo_root }
  if index
    data["repos"][index] = entry
  else
    data["repos"] << entry
  end
  FileUtils.mkdir_p(File.dirname(registry_file))
  File.write(registry_file, JSON.pretty_generate(data) + "\n")
' "$REGISTRY_FILE" "$REPO_ROOT" "$FE_PROJECT_PATHS" "$OUTPUT_DIR"

cat <<EOF
Configured lark-fe-task.
CONFIG_FILE=$CONFIG_FILE
REGISTRY_FILE=$REGISTRY_FILE
REPO_ROOT=$REPO_ROOT
FE_PROJECT_PATHS=$FE_PROJECT_PATHS
OUTPUT_DIR=$OUTPUT_DIR
EOF
