#!/bin/bash
# Installs dependencies in Claude Code cloud sessions so tests and lint work immediately.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-.}"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1
fi
