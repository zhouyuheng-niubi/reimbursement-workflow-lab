#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_STAMP="$(date '+%Y%m%d-%H%M%S')"
REPORT_DIR="$ROOT/runtime/reports/full-closure-$REPORT_STAMP"
SUMMARY_FILE="$REPORT_DIR/summary.md"
MANIFEST_FILE="$REPORT_DIR/manifest.json"
COMMAND_LOG="$REPORT_DIR/commands.log"
JAVA17_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || true)}"

PLAYWRIGHT_NODE="${PLAYWRIGHT_NODE:-<LOCAL_PATH>"
PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-file://<LOCAL_PATH>"
PLAYWRIGHT_EXECUTABLE_PATH="${PLAYWRIGHT_EXECUTABLE_PATH:-<LOCAL_PATH> Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing}"

mkdir -p "$REPORT_DIR"

if [ -n "$JAVA17_HOME" ]; then
  export JAVA_HOME="$JAVA17_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

run_cmd() {
  local name="$1"
  shift
  echo "" | tee -a "$COMMAND_LOG"
  echo ">>> $name" | tee -a "$COMMAND_LOG"
  "$@" 2>&1 | tee -a "$COMMAND_LOG"
}

cleanup_manifest() {
  if [ -f "$MANIFEST_FILE" ]; then
    python3 "$ROOT/scripts/api_smoke.py" --manifest "$MANIFEST_FILE" --cleanup >>"$COMMAND_LOG" 2>&1 || true
  fi
}

trap cleanup_manifest EXIT

cd "$ROOT"

run_cmd "stop-existing" ./stop.sh || true
run_cmd "start-platform" ./start.sh

run_cmd "backend-tests" mvn -q -f "$ROOT/backend/pom.xml" test -pl reimbursement-admin -am
run_cmd "backend-package" mvn -q -f "$ROOT/backend/pom.xml" -DskipTests package -pl reimbursement-admin -am
run_cmd "web-typecheck" "$ROOT/web/node_modules/.bin/vue-tsc" --noEmit -p "$ROOT/web/tsconfig.json"
run_cmd "web-build" npm --prefix "$ROOT/web" run build
run_cmd "mobile-typecheck" "$ROOT/mobile/node_modules/.bin/vue-tsc" --noEmit -p "$ROOT/mobile/tsconfig.json"
run_cmd "mobile-build-h5" npm --prefix "$ROOT/mobile" run build:h5

run_cmd "api-smoke" python3 "$ROOT/scripts/api_smoke.py" --manifest "$MANIFEST_FILE"

run_cmd "web-ui-e2e" env PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" PLAYWRIGHT_EXECUTABLE_PATH="$PLAYWRIGHT_EXECUTABLE_PATH" "$PLAYWRIGHT_NODE" "$ROOT/scripts/ui_e2e.mjs" --target web --manifest "$MANIFEST_FILE" --report-dir "$REPORT_DIR/web"
run_cmd "mobile-ui-e2e" env PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" PLAYWRIGHT_EXECUTABLE_PATH="$PLAYWRIGHT_EXECUTABLE_PATH" "$PLAYWRIGHT_NODE" "$ROOT/scripts/ui_e2e.mjs" --target mobile --manifest "$MANIFEST_FILE" --report-dir "$REPORT_DIR/mobile"

cat >"$SUMMARY_FILE" <<EOF
# 示例地区智能报销平台全链路回归结果

- 时间: $(date '+%Y-%m-%d %H:%M:%S')
- 报告目录: \`$REPORT_DIR\`
- Manifest: \`$MANIFEST_FILE\`
- 命令日志: \`$COMMAND_LOG\`
- Web 截图目录: \`$REPORT_DIR/web\`
- Mobile 截图目录: \`$REPORT_DIR/mobile\`

## 静态门
- 后端测试: 通过
- 后端打包: 通过
- Web 类型检查: 通过
- Web 构建: 通过
- Mobile 类型检查: 通过
- Mobile H5 构建: 通过

## 业务门
- API smoke: 通过
- Web Playwright: 通过
- Mobile H5 Playwright: 通过

## 产物
- 命令日志: \`runtime/reports/full-closure-$REPORT_STAMP/commands.log\`
- API manifest: \`runtime/reports/full-closure-$REPORT_STAMP/manifest.json\`
- Web 截图:
  - \`web-dashboard.png\`
  - \`web-ocr.png\`
  - \`web-invoice-list.png\`
  - \`web-reimbursement-detail.png\`
  - \`web-payment-confirm.png\`
  - \`web-payment-fail-refund.png\`
  - \`web-approval.png\`
  - \`web-guide.png\`
- Mobile 截图:
  - \`mobile-home.png\`
  - \`mobile-ocr.png\`
  - \`mobile-confirm-create.png\`
  - \`mobile-reimbursement-detail.png\`
  - \`mobile-reimbursement-list.png\`
  - \`mobile-approval.png\`
  - \`mobile-profile.png\`
EOF

echo "[full-regression] success: $SUMMARY_FILE"
