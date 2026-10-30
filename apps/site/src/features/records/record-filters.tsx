"use client";

import type { RecordType } from "@daytrace/contracts";
import { EMPTY_DISCOVERY_FILTERS, normalizeDiscoveryFilters, type DiscoveryFilters } from "./discovery-state";
import { RECORD_TYPE_LABELS } from "./record-list";
import styles from "./record-filters.module.css";

interface RecordFiltersProps {
  readonly filters: DiscoveryFilters;
  readonly availableTags: readonly string[];
  readonly disabled: boolean;
  readonly onChange: (filters: DiscoveryFilters) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}

export function RecordFilters({ filters, availableTags, disabled, onChange, onSubmit, onClear }: RecordFiltersProps) {
  const hasFilters = filters.type !== null || filters.tags.length > 0;
  return (
    <form className={styles.form} aria-label="筛选公开记录" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className={styles.typeField}>
        <span>记录类别</span>
        <select
          value={filters.type ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(normalizeDiscoveryFilters({
            type: (event.target.value || null) as RecordType | null,
            tags: filters.tags,
          }))}
        >
          <option value="">全部类别</option>
          {Object.entries(RECORD_TYPE_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
        </select>
      </label>
      {availableTags.length === 0 ? null : (
        <fieldset className={styles.tags} disabled={disabled}>
          <legend>标签（多选需同时满足）</legend>
          <div className={styles.tagOptions}>
            {availableTags.map((tag) => {
              const checked = filters.tags.includes(tag);
              return (
                <label key={tag} className={checked ? styles.selectedTag : styles.tag}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(normalizeDiscoveryFilters({
                      type: filters.type,
                      tags: checked ? filters.tags.filter((value) => value !== tag) : [...filters.tags, tag],
                    }))}
                  />
                  <span>{tag}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className={styles.actions}>
        <button type="submit" disabled={disabled}>应用筛选</button>
        <button
          type="button"
          className={styles.secondary}
          disabled={disabled || !hasFilters}
          onClick={() => { onChange(EMPTY_DISCOVERY_FILTERS); onClear(); }}
        >清除筛选</button>
      </div>
    </form>
  );
}
