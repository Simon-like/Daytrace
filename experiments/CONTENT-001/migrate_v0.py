#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from daytrace_content import migrate_markdown  # noqa: E402


def main() -> int:
    if len(sys.argv) != 3:
        print("用法：python3 migrate_v0.py <v0-index.md> <新index.md>", file=sys.stderr)
        return 2
    source, target = map(Path, sys.argv[1:])
    if target.exists():
        print(f"拒绝覆盖已有文件：{target}", file=sys.stderr)
        return 2
    try:
        migrated = migrate_markdown(source.read_text(encoding="utf-8"))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(migrated, encoding="utf-8")
    except (OSError, UnicodeError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(json.dumps({"migrated": True, "target": str(target), "visibility": "private-by-default-unless-explicit"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
