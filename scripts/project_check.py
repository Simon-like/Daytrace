#!/usr/bin/env python3
"""Read-only project structure checks; --write-index updates the catalog block only."""
from __future__ import annotations

import argparse
import json
import posixpath
import re
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
STATES = {"queued", "active", "review", "done", "blocked"}
SKIP = {".git", "node_modules", "dist", ".astro", ".next", ".nuxt", ".local", "__pycache__"}


def safe_relative(value: str) -> bool:
    if not isinstance(value, str) or not value or "\\" in value:
        return False
    p = PurePosixPath(value)
    if p.is_absolute() or ".." in p.parts or value in {".", "/"}:
        return False
    if ".git" in p.parts or any(x.startswith(".env") and x != ".env.example" for x in p.parts):
        return False
    return not (p.parts[:2] == ("content", "private") and value != "content/private/.gitkeep")


def exists_inside(root: Path, value: str) -> bool:
    if not safe_relative(value):
        return False
    p = (root / value).resolve()
    return p.is_relative_to(root.resolve()) and p.is_file()


def paths_overlap(a: str, b: str) -> bool:
    return a.rstrip("/") == b.rstrip("/") or (a.endswith("/") and b.startswith(a)) or (b.endswith("/") and a.startswith(b))


def validate_board(data: dict, root: Path) -> list[str]:
    errors = []
    tasks = data.get("tasks", [])
    if data.get("version") != 1 or not isinstance(tasks, list):
        return ["board: expected version=1 and tasks list"]
    ids = [t.get("id") for t in tasks]
    if len(ids) != len(set(ids)):
        errors.append("board: duplicate task IDs")
    by_id = {t.get("id"): t for t in tasks}
    for t in tasks:
        tid = t.get("id", "missing-id")
        state = t.get("status")
        if not re.fullmatch(r"[A-Z]+-\d{3}", str(tid)):
            errors.append(f"{tid}: invalid task ID")
        if state not in STATES:
            errors.append(f"{tid}: invalid status {state}")
        if state == "queued" and t.get("owner") is not None:
            errors.append(f"{tid}: queued task must not have owner")
        if state in STATES - {"queued"} and not t.get("owner"):
            errors.append(f"{tid}: {state} requires owner")
        if not exists_inside(root, t.get("card", "")):
            errors.append(f"{tid}: missing/unsafe task card")
        paths = t.get("allowed_paths", [])
        if not paths or any(not safe_relative(p) for p in paths):
            errors.append(f"{tid}: missing/unsafe allowed paths")
        for dep in t.get("depends_on", []):
            if dep not in by_id or dep == tid:
                errors.append(f"{tid}: invalid dependency {dep}")
            elif state in {"active", "review", "done"} and by_id[dep].get("status") != "done":
                errors.append(f"{tid}: dependency {dep} is not done")
        if state in {"review", "done"}:
            evidence = t.get("evidence", [])
            if not evidence or any(not exists_inside(root, p) for p in evidence):
                errors.append(f"{tid}: handoff evidence missing/unsafe")
        if state == "done" and (not t.get("reviewer") or not exists_inside(root, t.get("review", ""))):
            errors.append(f"{tid}: review record/reviewer required")
    visiting, visited = set(), set()

    def visit(tid):
        if tid in visiting:
            errors.append(f"board: dependency cycle at {tid}")
            return
        if tid in visited or tid not in by_id:
            return
        visiting.add(tid)
        for dep in by_id[tid].get("depends_on", []):
            visit(dep)
        visiting.remove(tid)
        visited.add(tid)

    for tid in by_id:
        visit(tid)
    writers = [t for t in tasks if t.get("status") in {"active", "review"}]
    for i, left in enumerate(writers):
        for right in writers[i + 1:]:
            if any(paths_overlap(a, b) for a in left.get("allowed_paths", []) for b in right.get("allowed_paths", [])):
                errors.append(f"board: overlapping write scopes {left['id']} / {right['id']}")
    return errors


def catalog_block(data: dict) -> str:
    rows = ["<!-- catalog:start -->", "| 文档 | 用途 | 状态 | 维护职责 |", "| --- | --- | --- | --- |"]
    for d in data["documents"]:
        link = posixpath.relpath(d["path"], "docs")
        rows.append(f"| [{d['title']}]({link}) | {d['purpose']} | {d['status']} | {d['owner_role']} |")
    return "\n".join(rows) + "\n<!-- catalog:end -->"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-index", action="store_true")
    args = parser.parse_args()
    errors = []
    catalog = json.loads((ROOT / "docs/catalog.json").read_text())
    for d in catalog["documents"]:
        if not exists_inside(ROOT, d["path"]):
            errors.append(f"catalog: missing/unsafe {d['path']}")
    paths = [d["path"] for d in catalog["documents"]]
    if len(paths) != len(set(paths)):
        errors.append("catalog: duplicate canonical paths")
    index = ROOT / "docs/README.md"
    text = index.read_text()
    pattern = r"<!-- catalog:start -->.*?<!-- catalog:end -->"
    expected = catalog_block(catalog)
    if not re.search(pattern, text, re.S):
        errors.append("docs/README.md: catalog markers missing")
    elif args.write_index:
        index.write_text(re.sub(pattern, lambda _: expected, text, flags=re.S))
    elif re.search(pattern, text, re.S).group() != expected:
        errors.append("docs index stale: run python3 scripts/project_check.py --write-index")
    board = json.loads((ROOT / "coordination/board.json").read_text())
    errors.extend(validate_board(board, ROOT))
    md_count = 0
    for p in ROOT.rglob("*.md"):
        rel = p.relative_to(ROOT)
        if any(x in SKIP for x in rel.parts) or rel.parts[:2] == ("content", "private"):
            continue
        md_count += 1
        for target in re.findall(r"\]\(([^)]+)\)", p.read_text()):
            if "://" in target or target.startswith(("#", "mailto:")):
                continue
            target = target.split("#")[0]
            if target and not (p.parent / target).exists():
                errors.append(f"{rel}: broken link {target}")
    for p in (ROOT / "knowledge/learnings").glob("*.md"):
        source = p.read_text()
        for key in ("id", "title", "status", "updated", "sources"):
            if not re.search(rf"^{key}:", source, re.M):
                errors.append(f"{p.relative_to(ROOT)}: missing knowledge metadata {key}")
    print(json.dumps({"passed": not errors, "documents_checked": md_count, "catalog_entries": len(paths), "tasks": len(board["tasks"]), "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
