from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote, urlsplit

from markdown_it import MarkdownIt

from .model import Issue

RECORD_PATH = re.compile(r"^/records/rec_[0-9a-f-]+/$")


def _inline_text(token: Any) -> str:
    return "".join(child.content for child in (token.children or []) if child.type in {"text", "code_inline"})


def render_markdown(metadata: dict[str, Any], body: str, file: str) -> tuple[str | None, list[dict[str, Any]], list[Issue]]:
    issues: list[Issue] = []
    toc: list[dict[str, Any]] = []
    attachments = {
        item["path"]: item["id"]
        for item in metadata.get("attachments", [])
        if isinstance(item, dict) and isinstance(item.get("path"), str) and isinstance(item.get("id"), str)
    }
    # 先识别原始 HTML 并拒绝；只有无原始 HTML 的 token 流才会输出。
    md = MarkdownIt("gfm-like", {"html": True, "linkify": False})
    md.validateLink = lambda _url: True  # 协议校验在下方统一执行，不静默丢弃危险链接。
    tokens = md.parse(body)

    def map_asset(url: str, field: str) -> str | None:
        if url != url.strip() or any(char in url for char in ("?", "#", "\\")):
            issues.append(Issue("CONTENT_ATTACHMENT_UNDECLARED", "附件引用不能带查询、锚点或反斜杠", file, field))
            return None
        decoded = unquote(url)
        normalized = decoded[2:] if decoded.startswith("./") else decoded
        if normalized not in attachments:
            issues.append(Issue("CONTENT_ATTACHMENT_UNDECLARED", "正文引用未在 attachments 中显式声明", file, field))
            return None
        return f"/api/v1/assets/{attachments[normalized]}"

    def inspect_url(token: Any, attribute: str, is_image: bool) -> None:
        url = token.attrGet(attribute) or ""
        if is_image:
            mapped = map_asset(url, "body.image")
            if mapped:
                token.attrSet(attribute, mapped)
            return
        if url.startswith("#"):
            return
        if RECORD_PATH.fullmatch(url):
            return
        split = urlsplit(url)
        if split.scheme in {"http", "https", "mailto"} and not url.startswith("//"):
            token.attrSet("rel", "noopener noreferrer")
            return
        if split.scheme or url.startswith("/") or url.startswith("//"):
            issues.append(Issue("CONTENT_URL_UNSAFE", "链接协议或站点路径不在允许范围", file, "body.link"))
            return
        mapped = map_asset(url, "body.link")
        if mapped:
            token.attrSet(attribute, mapped)

    heading_number = 0
    for index, token in enumerate(tokens):
        if token.type in {"html_block", "html_inline"}:
            issues.append(Issue("CONTENT_RAW_HTML_UNSUPPORTED", "v1 不接收原始 HTML；请改用 Markdown 或纯文本", file, "body"))
        if token.type == "heading_open":
            heading_number += 1
            level = int(token.tag[1:])
            if level == 1:
                issues.append(Issue("CONTENT_HEADING_INVALID", "正文不使用 H1；标题由 frontmatter 提供", file, "body"))
            inline = tokens[index + 1]
            heading_id = f"section-{heading_number}"
            token.attrSet("id", heading_id)
            toc.append({"id": heading_id, "text": _inline_text(inline), "level": level})
        children = token.children or []
        for child in children:
            if child.type in {"html_block", "html_inline"}:
                issues.append(Issue("CONTENT_RAW_HTML_UNSUPPORTED", "v1 不接收原始 HTML；请改用 Markdown 或纯文本", file, "body"))
            elif child.type == "image":
                inspect_url(child, "src", True)
            elif child.type == "link_open":
                inspect_url(child, "href", False)

    if issues:
        return None, [], issues
    html = md.renderer.render(tokens, md.options, {})
    return html, toc, []
