#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_FILE="$SKILL_DIR/config/repos.json"

if [[ ! -f "$REGISTRY_FILE" || ! -s "$REGISTRY_FILE" ]]; then
  cat <<'EOF'
No prd-fe-task repositories are configured yet.

Use:
  +config <repo-root> <fe-project-paths> [output-dir]
EOF
  exit 0
fi

/usr/bin/ruby -rjson -e '
  registry_file = ARGV[0]
  data = JSON.parse(File.read(registry_file))
  repos = data["repos"] || []

  if repos.empty?
    puts "No prd-fe-task repositories are configured yet."
    puts
    puts "Use:"
    puts "  +config <repo-root> <fe-project-paths> [output-dir]"
    exit 0
  end

  puts "Configured prd-fe-task repositories:"
  repos.each_with_index do |repo, index|
    fe_paths = Array(repo["feProjectPaths"]).join(",")
    puts
    puts "#{index + 1}. #{repo["repoRoot"]}"
    puts "   FE_PROJECT_PATHS=#{fe_paths}"
    puts "   OUTPUT_DIR=#{repo["outputDir"]}"
    puts "   UPDATED_AT=#{repo["updatedAt"]}"
  end
' "$REGISTRY_FILE"
