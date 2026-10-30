from __future__ import annotations

import yaml

from .frontmatter import split_frontmatter


def migrate_markdown(text: str) -> str:
    metadata, body, issues = split_frontmatter(text, "migration-input")
    if issues:
        raise ValueError("; ".join(issue.message for issue in issues))
    if "schemaVersion" in metadata:
        raise ValueError("仅迁移没有 schemaVersion 的 v0 文档")
    for field in ("id", "title", "slug", "updatedAt"):
        if field not in metadata:
            raise ValueError(f"v0 迁移缺少不能推断的字段：{field}")
    migrated = {
        "schemaVersion": 1,
        "id": metadata["id"],
        "type": {"life": "recipe", "engineering": "engineering", "reflection": "reflection"}.get(metadata.get("type"), metadata.get("type")),
        "title": metadata["title"],
        "slug": metadata["slug"],
        "oldSlugs": metadata.get("oldSlugs", []),
        "occurredOn": metadata.get("date"),
        "updatedAt": metadata["updatedAt"],
        "revision": 1,
        "tags": metadata.get("tags", []),
        "summary": metadata.get("summary"),
        "status": metadata.get("status", "draft"),
        "visibility": metadata.get("visibility", "private"),
        "attachments": metadata.get("attachments", []),
    }
    frontmatter = yaml.safe_dump(migrated, allow_unicode=True, sort_keys=False, width=1000).strip()
    return f"---\n{frontmatter}\n---\n{body}"
