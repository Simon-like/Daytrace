#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from daytrace_content import load_collection  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("用法：python3 validate_content.py <内容根目录>", file=sys.stderr)
        return 2
    collection = load_collection(Path(sys.argv[1]))
    result = {
        "valid": collection.ok,
        "recordCount": len(collection.records),
        "publicRecordCount": len(collection.public_snapshot()) if collection.ok else None,
        "contentRevision": collection.content_revision,
        "errors": [issue.to_dict() for issue in collection.errors],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if collection.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
