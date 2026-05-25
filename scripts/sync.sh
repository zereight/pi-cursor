#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${REPO_ROOT}/config/pi/agent"
TARGET_DIR="${HOME}/.pi/agent"
DRY_RUN=0
SKIP_NPM=0

usage() {
  cat <<'EOF'
Usage: ./scripts/sync.sh [options]

Sync pi-cursor agent config into ~/.pi/agent.

Options:
  --dry-run     Print actions without writing
  --target DIR  Install to DIR instead of ~/.pi/agent
  --skip-npm    Skip npm install in agent/npm
  -h, --help    Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --target)
      TARGET_DIR="${2:?--target requires a path}"
      shift 2
      ;;
    --skip-npm)
      SKIP_NPM=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

copy_file() {
  local src="$1"
  local dest="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] copy ${src} -> ${dest}"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "copied ${dest}"
}

echo "pi-cursor sync"
echo "  source: ${SOURCE_ROOT}"
echo "  target: ${TARGET_DIR}"

for file in settings.json cursor-sdk.json cursor-sdk-context-windows.json AGENTS.md; do
  copy_file "${SOURCE_ROOT}/${file}" "${TARGET_DIR}/${file}"
done

copy_file "${SOURCE_ROOT}/npm/package.json" "${TARGET_DIR}/npm/package.json"

if [[ "$SKIP_NPM" -eq 0 ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] npm install --prefix ${TARGET_DIR}/npm"
  elif command -v npm >/dev/null 2>&1; then
    echo "installing pi-cursor-sdk in ${TARGET_DIR}/npm ..."
    npm install --prefix "${TARGET_DIR}/npm" --no-fund --no-audit
  else
    echo "warning: npm not found; run: npm install --prefix ${TARGET_DIR}/npm" >&2
  fi
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ ! -f "${TARGET_DIR}/settings.json.pre-cursor-cli.bak" ]] && [[ -f "${TARGET_DIR}/settings.json" ]]; then
    echo ""
    echo "Tip: back up your previous settings before first sync:"
    echo "  cp ~/.pi/agent/settings.json ~/.pi/agent/settings.json.pre-cursor-cli.bak"
  fi
fi

echo ""
echo "Next steps:"
echo "  1. Add shell snippet: source ${REPO_ROOT}/shell/pi-cursor.zsh  (or copy into ~/.zshrc)"
echo "  2. Set CURSOR_API_KEY or run pi, then /login -> Cursor API key"
echo "  3. Launch: pi-cursor   (or: pi --model cursor/composer-2.5)"
echo "  4. Optional project override: copy examples/project/.pi/settings.json to your repo"
