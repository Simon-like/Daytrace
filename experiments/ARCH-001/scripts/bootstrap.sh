#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
npm install --prefix .tools --no-package-lock --no-save pnpm@11.23.0
./scripts/pnpm.sh install --frozen-lockfile --store-dir .pnpm-store
