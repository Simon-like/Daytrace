import concurrent.futures
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from project_check import validate_board
from task_claim import transition


class CoordinationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "docs/collaboration/tasks").mkdir(parents=True)
        for p in ["docs/collaboration/tasks/A.md", "docs/collaboration/tasks/B.md", "handoff.md", "review.md"]:
            (self.root / p).write_text("Test evidence\n")
        self.data = {"version": 1, "tasks": [
            {"id": "EX-001", "title": "A", "status": "queued", "owner": None, "depends_on": [], "allowed_paths": ["experiments/A/"], "card": "docs/collaboration/tasks/A.md", "evidence": []},
            {"id": "EX-002", "title": "B", "status": "queued", "owner": None, "depends_on": ["EX-001"], "allowed_paths": ["experiments/B/"], "card": "docs/collaboration/tasks/B.md", "evidence": []},
        ]}
        self.save()

    def tearDown(self):
        self.tmp.cleanup()

    def save(self):
        (self.root / "docs/collaboration/board.json").write_text(json.dumps(self.data))

    def test_concurrent_claim_has_exactly_one_winner(self):
        def claim(name):
            try:
                transition(self.root, "claim", "EX-001", name)
                return True
            except ValueError:
                return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(claim, ["agent-a", "agent-b"]))
        self.assertEqual(sum(results), 1)
        board = json.loads((self.root / "docs/collaboration/board.json").read_text())
        self.assertIn(board["tasks"][0]["owner"], ["agent-a", "agent-b"])
        self.assertFalse((self.root / "docs/collaboration/board.lock").exists())

    def test_dependency_blocks_claim_then_releases_after_review(self):
        with self.assertRaisesRegex(ValueError, "Dependencies not done"):
            transition(self.root, "claim", "EX-002", "agent-b")
        transition(self.root, "claim", "EX-001", "agent-a")
        with self.assertRaisesRegex(ValueError, "review state"):
            transition(self.root, "complete", "EX-001", "reviewer", "review.md")
        transition(self.root, "submit", "EX-001", "agent-a", "handoff.md")
        transition(self.root, "complete", "EX-001", "reviewer", "review.md")
        self.assertEqual(transition(self.root, "claim", "EX-002", "agent-b")["status"], "active")

    def test_non_owner_cannot_submit_or_change_owner(self):
        transition(self.root, "claim", "EX-001", "agent-a")
        before = (self.root / "docs/collaboration/board.json").read_text()
        with self.assertRaisesRegex(ValueError, "Only the active owner"):
            transition(self.root, "submit", "EX-001", "agent-b", "handoff.md")
        self.assertEqual(before, (self.root / "docs/collaboration/board.json").read_text())

    def test_missing_or_private_evidence_is_rejected(self):
        transition(self.root, "claim", "EX-001", "agent-a")
        for evidence in ["missing.md", "../outside.md", "content/private/record.md"]:
            with self.assertRaisesRegex(ValueError, "evidence path"):
                transition(self.root, "submit", "EX-001", "agent-a", evidence)

    def test_cycle_and_overlapping_active_scope_are_detected(self):
        self.data["tasks"][0]["depends_on"] = ["EX-002"]
        self.assertTrue(any("cycle" in x for x in validate_board(self.data, self.root)))
        for task in self.data["tasks"]:
            task.update(status="active", owner=task["id"], depends_on=[], allowed_paths=["apps/site/"])
        self.assertTrue(any("overlapping" in x for x in validate_board(self.data, self.root)))


if __name__ == "__main__":
    unittest.main()
