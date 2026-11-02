import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from project_check import BOARD_RELATIVE, document_policy_errors


class DocumentationPolicyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_one_central_board_lives_under_docs(self):
        self.assertEqual(str(BOARD_RELATIVE), 'docs/collaboration/board.json')

    def test_project_notes_may_not_spread_back_into_source_or_root(self):
        for path in ['apps/api/notes.md', 'scripts/demo/README.md', 'coordination/handoff.md', 'knowledge/lesson.md']:
            self.assertTrue(document_policy_errors(self.root, [Path(path)]), path)

    def test_site_markdown_and_synthetic_fixtures_are_not_project_docs(self):
        data = ['content/public/engineering/topic/index.md', 'content/private/note.md',
                'apps/api/fixtures/demo/public/recipe/index.md',
                'experiments/CONTENT-001/fixtures/valid/recipe/index.md',
                'experiments/ARCH-001/content/private/private-arch-canary.md']
        self.assertEqual(document_policy_errors(self.root, list(map(Path, data))), [])

    def test_root_and_scoped_agent_entries_stay_thin(self):
        scoped = self.root / 'apps/site/AGENTS.md'
        scoped.parent.mkdir(parents=True)
        scoped.write_text('Use [shared rules](../../docs/collaboration/rules/web.md).\n')
        self.assertEqual(document_policy_errors(self.root, [Path('README.md'), Path('AGENTS.md'), Path('apps/site/AGENTS.md')]), [])
        scoped.write_text('duplicated rule\n' * 40)
        self.assertTrue(document_policy_errors(self.root, [Path('apps/site/AGENTS.md')]))

    def test_status_is_read_only_at_the_explicit_central_root(self):
        (self.root / ".git").mkdir()
        board = self.root / BOARD_RELATIVE
        board.parent.mkdir(parents=True)
        payload = {'version': 1, 'tasks': []}
        board.write_text(json.dumps(payload))
        before = board.read_bytes()
        script = Path(__file__).resolve().parents[2] / 'scripts/task_claim.py'
        result = subprocess.run([sys.executable, str(script), '--root', str(self.root), 'status'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['tasks'], [])
        self.assertEqual(board.read_bytes(), before)
        self.assertFalse(board.with_suffix('.lock').exists())

    def test_a_worktree_copy_is_not_accepted_as_the_central_queue(self):
        (self.root / '.git').write_text('gitdir: /example/common/worktrees/demo\n')
        script = Path(__file__).resolve().parents[2] / 'scripts/task_claim.py'
        result = subprocess.run([sys.executable, str(script), '--root', str(self.root), 'status'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('central', result.stderr.lower())


if __name__ == '__main__':
    unittest.main()
