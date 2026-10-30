from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from daytrace_content import load_collection, migrate_markdown, public_records  # noqa: E402

FIXTURES = ROOT / "fixtures"


class ContentContractTest(unittest.TestCase):
    def test_valid_three_types_render_from_one_parse(self) -> None:
        collection = load_collection(FIXTURES / "valid")
        self.assertEqual([], [issue.to_dict() for issue in collection.errors])
        self.assertEqual(3, len(collection.records))
        self.assertEqual({"engineering", "recipe", "reflection"}, {r.metadata["type"] for r in collection.records})
        self.assertEqual(3, len(public_records(collection)))
        for record in collection.records:
            self.assertTrue(record.html)
            self.assertTrue(record.toc)
            for item in record.toc:
                self.assertIn(f'id="{item["id"]}"', record.html)
            self.assertEqual("daytrace-markdown-1", record.parse_revision)

    def test_attachment_is_served_by_id_not_disk_path(self) -> None:
        collection = load_collection(FIXTURES / "valid")
        recipe = next(r for r in collection.records if r.metadata["type"] == "recipe")
        asset_id = recipe.metadata["attachments"][0]["id"]
        self.assertIn(f'src="/api/v1/assets/{asset_id}"', recipe.html)
        self.assertNotIn("images/map o-tofu.png", recipe.html)

    def test_missing_visibility_is_invalid_and_never_public(self) -> None:
        collection = load_collection(FIXTURES / "missing-visibility")
        self.assertIn("CONTENT_VISIBILITY_MISSING", {i.code for i in collection.errors})
        self.assertEqual("private", collection.records[0].effective_visibility)
        with self.assertRaises(ValueError):
            public_records(collection)

    def test_missing_attachment_is_locatable(self) -> None:
        collection = load_collection(FIXTURES / "missing-attachment")
        issue = next(i for i in collection.errors if i.code == "CONTENT_ATTACHMENT_MISSING")
        self.assertEqual("attachments[0].path", issue.field)
        self.assertIn("index.md", issue.file)

    def test_duplicate_id_fails_whole_collection(self) -> None:
        collection = load_collection(FIXTURES / "duplicate-id")
        self.assertIn("CONTENT_DUPLICATE_ID", {i.code for i in collection.errors})
        with self.assertRaises(ValueError):
            public_records(collection)

    def test_duplicate_slug_and_old_slug_fail(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = (FIXTURES / "valid" / "engineering" / "index.md").read_text(encoding="utf-8")
            for name, slug, old_slug in (("a", "same-slug", "old-a"), ("b", "other-slug", "same-slug")):
                record = root / name
                record.mkdir()
                text = source.replace("slug: microfrontend-practice", f"slug: {slug}")
                text = text.replace("oldSlugs: []", f"oldSlugs: [{old_slug}]")
                text = text.replace("rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111", f"rec_7d0c0f2d-8f5b-4f0e-a3a6-{name * 12}")
                (record / "index.md").write_text(text, encoding="utf-8")
            collection = load_collection(root)
            self.assertIn("CONTENT_DUPLICATE_SLUG", {i.code for i in collection.errors})

    def test_malicious_html_and_url_are_rejected(self) -> None:
        collection = load_collection(FIXTURES / "malicious")
        self.assertIn("CONTENT_RAW_HTML_UNSUPPORTED", {i.code for i in collection.errors})
        self.assertIn("CONTENT_URL_UNSAFE", {i.code for i in collection.errors})
        self.assertIsNone(collection.records[0].html)

    def test_path_escape_is_rejected_before_file_access(self) -> None:
        collection = load_collection(FIXTURES / "path-escape")
        self.assertIn("CONTENT_ATTACHMENT_PATH_INVALID", {i.code for i in collection.errors})
        self.assertIsNone(collection.records[0].html)

    def test_absolute_attachment_path_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            record = root / "record"
            record.mkdir()
            text = (FIXTURES / "valid" / "reflection" / "index.md").read_text(encoding="utf-8")
            text = text.replace("attachments: []", "attachments:\n  - id: ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444\n    path: /etc/passwd\n    mediaType: text/plain")
            (record / "index.md").write_text(text, encoding="utf-8")
            collection = load_collection(root)
            self.assertIn("CONTENT_ATTACHMENT_PATH_INVALID", {i.code for i in collection.errors})

    def test_public_projection_requires_published_and_explicit_public(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = FIXTURES / "valid" / "reflection" / "index.md"
            for marker, status, visibility in (("a", "draft", "public"), ("b", "published", "private"), ("c", "archived", "public")):
                record = root / f"{status}-{visibility}"
                record.mkdir()
                text = source.read_text(encoding="utf-8").replace("status: published", f"status: {status}").replace("visibility: public", f"visibility: {visibility}")
                text = text.replace("rec_7d0c0f2d-8f5b-4f0e-a3a6-333333333333", f"rec_7d0c0f2d-8f5b-4f0e-a3a6-{marker * 12}")
                text = text.replace("slug: one-sentence-reflection", f"slug: {status}-{visibility}")
                (record / "index.md").write_text(text, encoding="utf-8")
            collection = load_collection(root)
            self.assertFalse(collection.errors)
            self.assertEqual([], public_records(collection))

    def test_unknown_occurred_date_sorts_after_dated_records(self) -> None:
        records = public_records(load_collection(FIXTURES / "valid"))
        self.assertIsNone(records[-1].metadata["occurredOn"])
        self.assertEqual(["2026-10-28", "2026-10-26", None], [r.metadata["occurredOn"] for r in records])

    def test_duplicate_asset_id_fails_across_records(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for marker in ("a", "b"):
                target = root / marker
                shutil.copytree(FIXTURES / "valid" / "recipe", target)
                source = target / "index.md"
                text = source.read_text(encoding="utf-8")
                text = text.replace("rec_7d0c0f2d-8f5b-4f0e-a3a6-222222222222", f"rec_7d0c0f2d-8f5b-4f0e-a3a6-{marker * 12}")
                text = text.replace("slug: mapo-tofu-practice", f"slug: mapo-tofu-{marker}")
                source.write_text(text, encoding="utf-8")
            collection = load_collection(root)
            self.assertIn("CONTENT_DUPLICATE_ASSET_ID", {i.code for i in collection.errors})

    def test_broken_collection_cannot_become_empty_success(self) -> None:
        collection = load_collection(FIXTURES / "missing-visibility")
        self.assertTrue(collection.errors)
        with self.assertRaises(ValueError):
            collection.public_snapshot()

    def test_content_revision_tracks_source_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(FIXTURES / "valid" / "reflection", root / "reflection")
            first = load_collection(root).content_revision
            with (root / "reflection" / "index.md").open("a", encoding="utf-8") as handle:
                handle.write("\n补一句合成测试内容。\n")
            second = load_collection(root).content_revision
            self.assertNotEqual(first, second)

    def test_migration_is_deterministic_and_defaults_private(self) -> None:
        source = FIXTURES / "migration" / "v0" / "index.md"
        expected = FIXTURES / "migration" / "expected" / "index.md"
        migrated = migrate_markdown(source.read_text(encoding="utf-8"))
        collection_source = load_collection(FIXTURES / "migration" / "expected")
        self.assertFalse(collection_source.errors)
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "record" / "index.md"
            target.parent.mkdir()
            target.write_text(migrated, encoding="utf-8")
            actual_collection = load_collection(Path(tmp))
            self.assertFalse(actual_collection.errors)
            actual = actual_collection.records[0].metadata
            wanted = collection_source.records[0].metadata
            self.assertEqual(wanted, actual)
            self.assertEqual("private", actual["visibility"])
            self.assertEqual("recipe", actual["type"])
            self.assertEqual(1, actual["schemaVersion"])

    def test_frontmatter_schema_is_machine_readable(self) -> None:
        schema_path = ROOT.parents[1] / "docs" / "architecture" / "contracts" / "frontmatter-v1.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertIn("visibility", schema["required"])
        self.assertIn("status", schema["required"])
        self.assertEqual(1, schema["properties"]["schemaVersion"]["const"])

    def test_cli_distinguishes_valid_and_invalid(self) -> None:
        valid = subprocess.run([sys.executable, str(ROOT / "validate_content.py"), str(FIXTURES / "valid")], capture_output=True, text=True, check=False)
        self.assertEqual(0, valid.returncode, valid.stdout + valid.stderr)
        self.assertEqual(3, json.loads(valid.stdout)["recordCount"])
        invalid = subprocess.run([sys.executable, str(ROOT / "validate_content.py"), str(FIXTURES / "missing-visibility")], capture_output=True, text=True, check=False)
        self.assertEqual(1, invalid.returncode)
        self.assertIn("CONTENT_VISIBILITY_MISSING", invalid.stdout)


if __name__ == "__main__":
    unittest.main()
