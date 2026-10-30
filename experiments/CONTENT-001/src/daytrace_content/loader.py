from __future__ import annotations

import hashlib
from pathlib import Path

from .frontmatter import split_frontmatter
from .model import Collection, Issue, Record
from .rendering import render_markdown
from .validation import validate_attachment_files, validate_metadata


def _content_revision(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted((item for item in root.rglob("*") if item.is_file() and not item.is_symlink()), key=lambda item: item.as_posix()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _duplicate_issues(records: list[Record]) -> list[Issue]:
    issues: list[Issue] = []
    ids: dict[str, str] = {}
    asset_ids: dict[str, str] = {}
    routes: dict[str, str] = {}
    for record in records:
        for attachment in record.metadata.get("attachments", []):
            if not isinstance(attachment, dict) or not isinstance(attachment.get("id"), str):
                continue
            asset_id = attachment["id"]
            if asset_id in asset_ids:
                issues.append(Issue("CONTENT_DUPLICATE_ASSET_ID", f"附件 id 与 {asset_ids[asset_id]} 重复", record.source_path, "attachments.id"))
            else:
                asset_ids[asset_id] = record.source_path
        record_id = record.metadata.get("id")
        if isinstance(record_id, str):
            if record_id in ids:
                issues.append(Issue("CONTENT_DUPLICATE_ID", f"id 与 {ids[record_id]} 重复", record.source_path, "id"))
            else:
                ids[record_id] = record.source_path
        values = [("slug", record.metadata.get("slug"))]
        values.extend(("oldSlugs", item) for item in record.metadata.get("oldSlugs", []) if isinstance(item, str))
        for field, value in values:
            if not isinstance(value, str):
                continue
            if value in routes:
                issues.append(Issue("CONTENT_DUPLICATE_SLUG", f"slug/旧链接与 {routes[value]} 冲突", record.source_path, field))
            else:
                routes[value] = record.source_path
    return issues


def load_collection(root: Path | str) -> Collection:
    root_path = Path(root).resolve()
    if not root_path.is_dir():
        issue = Issue("CONTENT_ROOT_INVALID", "内容根目录不存在或不是目录", str(root_path))
        return Collection(root_path, [], [issue], "")
    records: list[Record] = []
    errors: list[Issue] = []
    for source in sorted(root_path.rglob("index.md"), key=lambda item: item.as_posix()):
        relative = source.relative_to(root_path).as_posix()
        try:
            text = source.read_text(encoding="utf-8")
        except (UnicodeError, OSError) as error:
            errors.append(Issue("CONTENT_READ_FAILED", f"无法读取 UTF-8 Markdown：{error}", relative))
            continue
        raw_metadata, body, parse_issues = split_frontmatter(text, relative)
        errors.extend(parse_issues)
        if parse_issues:
            continue
        metadata, metadata_issues = validate_metadata(raw_metadata, relative)
        metadata_issues.extend(validate_attachment_files(source.parent, metadata, relative))
        html, toc, render_issues = render_markdown(metadata, body, relative)
        metadata_issues.extend(render_issues)
        errors.extend(metadata_issues)
        records.append(Record(relative, metadata, body, metadata.get("visibility", "private"), None if metadata_issues else html, [] if metadata_issues else toc))
    errors.extend(_duplicate_issues(records))
    return Collection(root_path, records, errors, _content_revision(root_path))
