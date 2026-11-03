"use client";

import { useId, useState } from "react";
import type { RecordType } from "@daytrace/contracts";
import { Button, Checkbox, Select } from "../../components/ui";
import { EMPTY_DISCOVERY_FILTERS, normalizeDiscoveryFilters, type DiscoveryFilters } from "./discovery-state";
import { RECORD_TYPE_LABELS } from "./record-list";

interface RecordFiltersProps {
  readonly filters: DiscoveryFilters;
  readonly availableTags: readonly string[];
  readonly disabled: boolean;
  readonly onChange: (filters: DiscoveryFilters) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}

const typeOptions = [
  { value: "all", label: "全部类别" },
  ...Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function RecordFilters({ filters, availableTags, disabled, onChange, onSubmit, onClear }: RecordFiltersProps) {
  const [tagsOpen, setTagsOpen] = useState(filters.tags.length > 0);
  const groupId = useId();
  const hasFilters = filters.type !== null || filters.tags.length > 0;
  return (
    <form className="mb-9 rounded-[20px] border border-[#d5ddd0] bg-[#edf0e8] p-3 shadow-[0_3px_0_#dfe4da,0_12px_28px_rgba(36,49,40,0.045)] sm:p-4" aria-label="筛选公开记录" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="w-full max-w-60">
          <label className="mb-2 block text-xs text-muted" htmlFor={`${groupId}-type`}>记录类别</label>
          <Select
            id={`${groupId}-type`}
            aria-label="记录类别"
            value={filters.type ?? "all"}
            options={typeOptions}
            disabled={disabled}
            onValueChange={(value) => onChange(normalizeDiscoveryFilters({
              type: (value === "all" ? null : value) as RecordType | null,
              tags: filters.tags,
            }))}
          />
        </div>
        {availableTags.length === 0 ? null : (
          <Button variant="secondary" aria-expanded={tagsOpen} aria-controls={`${groupId}-tags`} onClick={() => setTagsOpen(open => !open)}>
            <span aria-hidden="true" className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sage font-mono text-xs text-archive">#</span>标签{filters.tags.length > 0 ? ` · 已选 ${filters.tags.length}` : ""}
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled}>应用筛选</Button>
          <Button variant="ghost" disabled={disabled || !hasFilters} onClick={() => { onChange(EMPTY_DISCOVERY_FILTERS); onClear(); }}>清除筛选</Button>
        </div>
      </div>
      {availableTags.length === 0 || !tagsOpen ? null : (
        <fieldset className="motion-region motion-region-left m-0 mt-5 border-0 p-0" disabled={disabled} id={`${groupId}-tags`}>
          <legend className="mb-3 text-xs text-muted">选择标签，多选需同时满足</legend>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
            {availableTags.map((tag, index) => {
              const checked = filters.tags.includes(tag);
              const id = `${groupId}-tag-${index}`;
              return (
                <div key={tag} className="flex min-h-11 items-center gap-3 text-sm text-ink">
                  <Checkbox
                    id={id}
                    aria-label={tag}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => onChange(normalizeDiscoveryFilters({
                      type: filters.type,
                      tags: checked ? filters.tags.filter((value) => value !== tag) : [...filters.tags, tag],
                    }))}
                  />
                  <label htmlFor={id} className="cursor-pointer py-2">{tag}</label>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </form>
  );
}
