from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    file: str
    field: str | None = None

    def to_dict(self) -> dict[str, str]:
        result = {"code": self.code, "message": self.message, "file": self.file}
        if self.field:
            result["field"] = self.field
        return result


@dataclass
class Record:
    source_path: str
    metadata: dict[str, Any]
    body: str
    effective_visibility: str
    html: str | None = None
    toc: list[dict[str, Any]] = field(default_factory=list)
    parse_revision: str = "daytrace-markdown-1"


@dataclass
class Collection:
    root: Path
    records: list[Record]
    errors: list[Issue]
    content_revision: str

    @property
    def ok(self) -> bool:
        return not self.errors

    def public_snapshot(self) -> list[Record]:
        if self.errors:
            raise ValueError("invalid content cannot be projected as a successful snapshot")
        visible = [
            record
            for record in self.records
            if record.metadata["status"] == "published"
            and record.effective_visibility == "public"
        ]
        dated = sorted(
            (record for record in visible if record.metadata["occurredOn"] is not None),
            key=lambda record: (record.metadata["occurredOn"], record.metadata["updatedAt"], record.metadata["id"]),
            reverse=True,
        )
        undated = sorted(
            (record for record in visible if record.metadata["occurredOn"] is None),
            key=lambda record: (record.metadata["updatedAt"], record.metadata["id"]),
            reverse=True,
        )
        return dated + undated


def public_records(collection: Collection) -> list[Record]:
    return collection.public_snapshot()
