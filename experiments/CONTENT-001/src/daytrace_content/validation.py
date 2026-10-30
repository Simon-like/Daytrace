from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any

from .model import Issue

ID_PATTERN = re.compile(r"^rec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
ASSET_ID_PATTERN = re.compile(r"^ast_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ALLOWED_FIELDS = {
    "schemaVersion", "id", "type", "title", "slug", "oldSlugs", "occurredOn",
    "updatedAt", "revision", "tags", "summary", "status", "visibility", "attachments",
}
REQUIRED_FIELDS = {
    "schemaVersion", "id", "type", "title", "slug", "occurredOn", "updatedAt",
    "revision", "status", "visibility",
}
ALLOWED_MEDIA_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"}


def _valid_text(value: Any, maximum: int) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= maximum
        and value == value.strip()
        and value == unicodedata.normalize("NFC", value)
        and not any(ord(char) < 32 for char in value)
    )


def valid_attachment_path(value: Any) -> bool:
    if not isinstance(value, str) or not value or value != value.strip():
        return False
    if "\\" in value or "\x00" in value or value.startswith("/"):
        return False
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return False
    if ":" in parts[0]:
        return False
    return PurePosixPath(value).parts == tuple(parts)


def validate_metadata(metadata: dict[str, Any], file: str) -> tuple[dict[str, Any], list[Issue]]:
    issues: list[Issue] = []
    result = dict(metadata)
    result.setdefault("oldSlugs", [])
    result.setdefault("tags", [])
    result.setdefault("summary", None)
    result.setdefault("attachments", [])
    if "visibility" not in metadata:
        result["visibility"] = "private"
        issues.append(Issue("CONTENT_VISIBILITY_MISSING", "visibility 缺失；安全默认 private，但记录仍无效", file, "visibility"))

    for key in sorted(set(metadata) - ALLOWED_FIELDS):
        issues.append(Issue("CONTENT_FIELD_INVALID", f"未知字段 {key}", file, key))
    for key in sorted(REQUIRED_FIELDS - set(metadata) - {"visibility"}):
        issues.append(Issue("CONTENT_FIELD_REQUIRED", f"缺少必填字段 {key}", file, key))

    if "schemaVersion" in metadata and metadata["schemaVersion"] != 1:
        issues.append(Issue("CONTENT_SCHEMA_UNSUPPORTED", "仅支持 schemaVersion: 1", file, "schemaVersion"))
    if "id" in metadata and not ID_PATTERN.fullmatch(str(metadata["id"])):
        issues.append(Issue("CONTENT_FIELD_INVALID", "id 必须为 rec_ 加小写 UUID", file, "id"))
    if metadata.get("type") not in {"engineering", "recipe", "reflection"}:
        issues.append(Issue("CONTENT_FIELD_INVALID", "type 仅支持 engineering/recipe/reflection", file, "type"))
    if "title" in metadata and not _valid_text(metadata["title"], 120):
        issues.append(Issue("CONTENT_FIELD_INVALID", "title 必须为 1–120 字纯文本", file, "title"))
    if "slug" in metadata and (not isinstance(metadata["slug"], str) or len(metadata["slug"]) > 80 or not SLUG_PATTERN.fullmatch(metadata["slug"])):
        issues.append(Issue("CONTENT_FIELD_INVALID", "slug 必须为小写 ASCII 连字符形式", file, "slug"))
    if metadata.get("status") not in {"draft", "published", "archived"}:
        issues.append(Issue("CONTENT_FIELD_INVALID", "status 仅支持 draft/published/archived", file, "status"))
    if result.get("visibility") not in {"public", "private"}:
        issues.append(Issue("CONTENT_FIELD_INVALID", "visibility 仅支持 public/private", file, "visibility"))
    if isinstance(metadata.get("revision"), bool) or not isinstance(metadata.get("revision"), int) or metadata.get("revision", 0) < 1:
        issues.append(Issue("CONTENT_FIELD_INVALID", "revision 必须为从 1 开始的整数", file, "revision"))

    occurred = metadata.get("occurredOn")
    if "occurredOn" in metadata and occurred is not None:
        try:
            if not isinstance(occurred, str) or datetime.strptime(occurred, "%Y-%m-%d").date().isoformat() != occurred:
                raise ValueError
        except ValueError:
            issues.append(Issue("CONTENT_FIELD_INVALID", "occurredOn 必须为 YYYY-MM-DD 或 null", file, "occurredOn"))
    updated = metadata.get("updatedAt")
    if "updatedAt" in metadata:
        try:
            if not isinstance(updated, str):
                raise ValueError
            parsed = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            if parsed.tzinfo is None or parsed.utcoffset() is None:
                raise ValueError
        except ValueError:
            issues.append(Issue("CONTENT_FIELD_INVALID", "updatedAt 必须为带时区的 RFC 3339 时间", file, "updatedAt"))

    old_slugs = result.get("oldSlugs")
    if not isinstance(old_slugs, list) or len(old_slugs) > 16 or any(not isinstance(item, str) or not SLUG_PATTERN.fullmatch(item) for item in old_slugs):
        issues.append(Issue("CONTENT_FIELD_INVALID", "oldSlugs 必须为合法 slug 数组", file, "oldSlugs"))
    tags = result.get("tags")
    if not isinstance(tags, list) or len(tags) > 16 or any(not _valid_text(item, 32) for item in tags):
        issues.append(Issue("CONTENT_FIELD_INVALID", "tags 最多 16 个，每项为 1–32 字文本", file, "tags"))
    elif len({item.casefold() for item in tags}) != len(tags):
        issues.append(Issue("CONTENT_FIELD_INVALID", "tags 不得重复", file, "tags"))
    summary = result.get("summary")
    if summary is not None and (not isinstance(summary, str) or len(summary) > 280 or summary != summary.strip()):
        issues.append(Issue("CONTENT_FIELD_INVALID", "summary 必须为不超过 280 字的文本或 null", file, "summary"))

    attachments = result.get("attachments")
    if not isinstance(attachments, list) or len(attachments) > 100:
        issues.append(Issue("CONTENT_FIELD_INVALID", "attachments 必须为最多 100 项的数组", file, "attachments"))
        result["attachments"] = []
    else:
        seen_ids: set[str] = set()
        seen_paths: set[str] = set()
        for index, attachment in enumerate(attachments):
            base = f"attachments[{index}]"
            if not isinstance(attachment, dict) or set(attachment) - {"id", "path", "mediaType", "title", "width", "height"}:
                issues.append(Issue("CONTENT_FIELD_INVALID", "附件必须是受支持字段的对象", file, base))
                continue
            asset_id = attachment.get("id")
            path = attachment.get("path")
            if not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id):
                issues.append(Issue("CONTENT_FIELD_INVALID", "附件 id 必须为 ast_ 加小写 UUID", file, f"{base}.id"))
            elif asset_id in seen_ids:
                issues.append(Issue("CONTENT_FIELD_INVALID", "附件 id 不得重复", file, f"{base}.id"))
            else:
                seen_ids.add(asset_id)
            if not valid_attachment_path(path):
                issues.append(Issue("CONTENT_ATTACHMENT_PATH_INVALID", "附件路径必须是记录目录内的相对路径", file, f"{base}.path"))
            elif path in seen_paths:
                issues.append(Issue("CONTENT_FIELD_INVALID", "附件 path 不得重复", file, f"{base}.path"))
            else:
                seen_paths.add(path)
            if attachment.get("mediaType") not in ALLOWED_MEDIA_TYPES:
                issues.append(Issue("CONTENT_FIELD_INVALID", "mediaType 不在 v1 允许列表", file, f"{base}.mediaType"))
            if "title" in attachment and not _valid_text(attachment["title"], 120):
                issues.append(Issue("CONTENT_FIELD_INVALID", "附件 title 必须为纯文本", file, f"{base}.title"))
            for dimension in ("width", "height"):
                if dimension in attachment and (isinstance(attachment[dimension], bool) or not isinstance(attachment[dimension], int) or attachment[dimension] < 1):
                    issues.append(Issue("CONTENT_FIELD_INVALID", "图片尺寸必须为正整数", file, f"{base}.{dimension}"))
    return result, issues


def validate_attachment_files(record_dir: Path, metadata: dict[str, Any], file: str) -> list[Issue]:
    issues: list[Issue] = []
    root = record_dir.resolve()
    for index, attachment in enumerate(metadata.get("attachments", [])):
        if not isinstance(attachment, dict) or not valid_attachment_path(attachment.get("path")):
            continue
        relative = PurePosixPath(attachment["path"])
        candidate = record_dir.joinpath(*relative.parts)
        try:
            candidate.resolve().relative_to(root)
        except ValueError:
            issues.append(Issue("CONTENT_ATTACHMENT_PATH_INVALID", "附件解析后越出记录目录", file, f"attachments[{index}].path"))
            continue
        if candidate.is_symlink() or not candidate.is_file():
            issues.append(Issue("CONTENT_ATTACHMENT_MISSING", "附件不存在、不是普通文件或为符号链接", file, f"attachments[{index}].path"))
    return issues
