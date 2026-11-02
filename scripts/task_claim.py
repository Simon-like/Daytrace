#!/usr/bin/env python3
"""Atomic local task transitions. No message sending, code execution, or remote lock."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import time

from project_check import BOARD_RELATIVE, ROOT, exists_inside, validate_board


@contextmanager
def board_lock(board: Path):
    lock = board.with_suffix(".lock")
    acquired = False
    for _ in range(200):
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            acquired = True
            with os.fdopen(fd, "w") as f:
                json.dump({"pid": os.getpid(), "at": datetime.now(timezone.utc).isoformat()}, f)
            break
        except FileExistsError:
            time.sleep(.025)
    if not acquired:
        raise ValueError("Central board is locked; inspect the lock and handoff before retrying. Do not auto-steal it.")
    try:
        yield
    finally:
        lock.unlink(missing_ok=True)


def transition(root: Path, action: str, task_id: str, agent: str, evidence: str | None = None) -> dict:
    if not agent.strip():
        raise ValueError("Agent/reviewer name is required")
    board = root / BOARD_RELATIVE
    with board_lock(board):
        data = json.loads(board.read_text())
        tasks = {t["id"]: t for t in data["tasks"]}
        if task_id not in tasks:
            raise ValueError(f"Unknown task: {task_id}")
        t = tasks[task_id]
        state = t["status"]
        if action == "claim":
            if state != "queued" or t.get("owner"):
                raise ValueError(f"Task is already {state}, owner={t.get('owner')}")
            pending = [d for d in t.get("depends_on", []) if tasks[d]["status"] != "done"]
            if pending:
                raise ValueError(f"Dependencies not done: {', '.join(pending)}")
            t.update(status="active", owner=agent)
        elif action == "submit":
            if state != "active" or t.get("owner") != agent:
                raise ValueError("Only the active owner can submit")
            if not evidence or not exists_inside(root, evidence):
                raise ValueError("Existing safe handoff evidence path is required")
            t.update(status="review", evidence=list(dict.fromkeys(t.get("evidence", []) + [evidence])))
        elif action == "complete":
            if state != "review":
                raise ValueError("Complete requires review state")
            if not evidence or not exists_inside(root, evidence):
                raise ValueError("Existing safe review record is required")
            t.update(status="done", review=evidence, reviewer=agent)
        else:
            raise ValueError(f"Unsupported action: {action}")
        errors = validate_board(data, root)
        if errors:
            raise ValueError("; ".join(errors))
        now = datetime.now(timezone.utc).isoformat()
        data["updated"] = now
        data.setdefault("history", []).append({"at": now, "task": task_id, "action": action, "actor": agent, "evidence": evidence})
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", dir=board.parent, prefix=".board-", suffix=".tmp", delete=False) as f:
                temp_path = Path(f.name)
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, board)
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)
        return {"task": task_id, "status": t["status"], "owner": t.get("owner"), "reviewer": t.get("reviewer")}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT, help="Primary checkout containing the central docs/collaboration/board.json")
    parser.add_argument("action", choices=["claim", "submit", "complete", "status"])
    parser.add_argument("task", nargs="?")
    parser.add_argument("agent", nargs="?")
    parser.add_argument("--evidence")
    args = parser.parse_args()
    root = args.root.resolve()
    if (root / ".git").is_file():
        parser.error("A worktree copy is not the central checkout; pass --root /path/to/primary-checkout")
    if not (root / ".git").is_dir():
        parser.error("--root must point to the primary Git checkout, not an unversioned central-board copy")
    if not (root / BOARD_RELATIVE).is_file():
        parser.error("Central board is missing; sync main and use docs/collaboration/board.json")
    if args.action == "status":
        if args.task or args.agent or args.evidence:
            parser.error("status is read-only and takes no task, agent, or evidence")
        data = json.loads((root / BOARD_RELATIVE).read_text())
        fields = ("id", "title", "status", "owner", "depends_on")
        print(json.dumps({"board": str(root / BOARD_RELATIVE), "tasks": [{key: task.get(key) for key in fields} for task in data["tasks"]]}, ensure_ascii=False, indent=2))
        return 0
    if not args.task or not args.agent:
        parser.error("claim/submit/complete require task and agent")
    try:
        print(json.dumps(transition(root, args.action, args.task, args.agent, args.evidence), ensure_ascii=False))
        return 0
    except (ValueError, KeyError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
