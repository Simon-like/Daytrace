#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ ! -f "$ROOT/.tools/node_modules/pnpm/bin/pnpm.cjs" ]; then
  echo "Run ./scripts/bootstrap.sh first." >&2
  exit 1
fi
cd "$ROOT"
PATH="$ROOT/.tools/node_modules/.bin:$PATH"
export PATH
exec node "$ROOT/.tools/node_modules/pnpm/bin/pnpm.cjs" "$@"
