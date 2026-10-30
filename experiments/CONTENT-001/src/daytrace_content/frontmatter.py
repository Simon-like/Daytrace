from __future__ import annotations

from datetime import date, datetime
from typing import Any

import yaml

from .model import Issue


def split_frontmatter(text: str, file: str) -> tuple[dict[str, Any], str, list[Issue]]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if not normalized.startswith("---\n"):
        return {}, normalized, [Issue("CONTENT_FRONTMATTER_MISSING", "文件必须以 YAML frontmatter 开始", file)]
    end = normalized.find("\n---\n", 4)
    if end < 0:
        return {}, "", [Issue("CONTENT_FRONTMATTER_INVALID", "frontmatter 缺少结束分隔线", file)]
    raw = normalized[4:end]
    body = normalized[end + 5 :]
    try:
        metadata = yaml.safe_load(raw)
    except yaml.YAMLError as error:
        return {}, body, [Issue("CONTENT_FRONTMATTER_INVALID", f"YAML 无法解析：{error}", file)]
    if not isinstance(metadata, dict) or not all(isinstance(key, str) for key in metadata):
        return {}, body, [Issue("CONTENT_FRONTMATTER_INVALID", "frontmatter 必须是字符串键的对象", file)]
    for key in ("occurredOn", "updatedAt", "date"):
        value = metadata.get(key)
        if isinstance(value, (datetime, date)):
            metadata[key] = value.isoformat()
    return metadata, body, []
