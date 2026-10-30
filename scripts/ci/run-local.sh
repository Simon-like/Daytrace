#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
PNPM=(npx --yes pnpm@11.23.0)

python3 scripts/project_check.py
python3 -m unittest discover -s tests/foundation -v
python3 -m unittest discover -s tests/cicd -v
node --test tests/cicd/*.test.mjs
bash -n ops/cicd/remote-deploy.sh ops/cicd/host-deploy.sh ops/cicd/container-smoke.sh

"${PNPM[@]}" install --frozen-lockfile
"${PNPM[@]}" lint
"${PNPM[@]}" typecheck
"${PNPM[@]}" content:validate
"${PNPM[@]}" audit --audit-level high
"${PNPM[@]}" test:unit
"${PNPM[@]}" test:integration
"${PNPM[@]}" build
node scripts/ci/prepare-standalone.mjs
node scripts/ci/privacy-check.mjs
"${PNPM[@]}" test:e2e

echo "Local CI checks passed. Container and hosted-deployment checks are not included."
