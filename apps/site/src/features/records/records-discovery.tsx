"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RecordListData } from "@daytrace/contracts";
import { Button } from "../../components/ui";
import {
  createDiscoveryEntry,
  createDiscoveryUrl,
  EMPTY_DISCOVERY_FILTERS,
  mergeDiscoveryHistoryState,
  normalizeDiscoveryFilters,
  parseDiscoveryFilters,
  readDiscoveryEntry,
  sameDiscoveryFilters,
  type DiscoveryFilters,
  type DiscoverySnapshot,
} from "./discovery-state";
import { RecordFilters } from "./record-filters";
import { RecordList } from "./record-list";
import { fetchPublicRecords, RecordsRequestError } from "./records-api";
import styles from "./records-discovery.module.css";

interface RecordsDiscoveryProps {
  readonly initialRecords: RecordListData;
  readonly initialContentRevision?: string;
  readonly initialFilters?: DiscoveryFilters;
  readonly availableTags?: readonly string[];
}

type LoadNavigation = "push" | "none";

export function RecordsDiscovery({
  initialRecords,
  initialContentRevision,
  initialFilters = EMPTY_DISCOVERY_FILTERS,
  availableTags,
}: RecordsDiscoveryProps) {
  const normalizedInitial = normalizeDiscoveryFilters(initialFilters);
  const [snapshot, setSnapshot] = useState<DiscoverySnapshot>({
    filters: normalizedInitial,
    records: initialRecords,
    contentRevision: initialContentRevision ?? null,
  });
  const [selected, setSelected] = useState<DiscoveryFilters>(normalizedInitial);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(initialRecords.items.length === 0 ? "empty" : "ready");
  const [error, setError] = useState<{ code: string; requestId?: string } | null>(null);
  const snapshotRef = useRef(snapshot);
  const statusRef = useRef(status);
  const abortRef = useRef<AbortController | null>(null);
  const loadRef = useRef<(filters: DiscoveryFilters, navigation?: LoadNavigation, restoreY?: number) => Promise<void>>(async () => {});
  const tags = useMemo(() => [...new Set([...(availableTags ?? []), ...initialRecords.items.flatMap((record) => record.tags)])].sort(), [availableTags, initialRecords]);

  function applySnapshot(next: DiscoverySnapshot): void {
    snapshotRef.current = next;
    setSnapshot(next);
    setSelected(next.filters);
    const nextStatus = next.records.items.length === 0 ? "empty" : "ready";
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setError(null);
  }

  function savePosition(): void {
    if (statusRef.current === "loading" || statusRef.current === "error") return;
    window.history.replaceState(
      mergeDiscoveryHistoryState(window.history.state, createDiscoveryEntry(snapshotRef.current, window.scrollY)),
      "",
      window.location.href,
    );
  }

  async function load(filters: DiscoveryFilters, navigation: LoadNavigation = "none", restoreY?: number): Promise<void> {
    const normalized = normalizeDiscoveryFilters(filters);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSelected(normalized);
    statusRef.current = "loading";
    setStatus("loading");
    setError(null);
    if (navigation === "push") {
      const url = createDiscoveryUrl(window.location.pathname, window.location.search, normalized);
      window.history.pushState({ ...window.history.state, daytraceDiscovery: null }, "", url);
    }
    try {
      const response = await fetchPublicRecords(normalized, controller.signal);
      if (controller.signal.aborted) return;
      const next = { filters: normalized, records: response.data, contentRevision: response.contentRevision };
      applySnapshot(next);
      window.history.replaceState(
        mergeDiscoveryHistoryState(window.history.state, createDiscoveryEntry(next, restoreY ?? 0)),
        "",
        window.location.href,
      );
      if (restoreY !== undefined) requestAnimationFrame(() => window.scrollTo({ top: restoreY, behavior: "instant" }));
    } catch (cause: unknown) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) return;
      const failure = cause instanceof RecordsRequestError
        ? { code: cause.code, ...(cause.requestId === undefined ? {} : { requestId: cause.requestId }) }
        : { code: "API_UNAVAILABLE" };
      statusRef.current = "error";
      setStatus("error");
      setError(failure);
    }
  }
  loadRef.current = load;

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const restore = (): void => {
      const filters = parseDiscoveryFilters(window.location.search);
      const entry = readDiscoveryEntry(window.history.state?.daytraceDiscovery);
      if (entry !== null && sameDiscoveryFilters(entry.snapshot.filters, filters)) {
        applySnapshot(entry.snapshot);
        requestAnimationFrame(() => window.scrollTo({ top: entry.scrollY, behavior: "instant" }));
      } else {
        void loadRef.current(filters, "none", entry?.scrollY);
      }
    };
    const filters = parseDiscoveryFilters(window.location.search);
    const entry = readDiscoveryEntry(window.history.state?.daytraceDiscovery);
    if (entry !== null && sameDiscoveryFilters(entry.snapshot.filters, filters)) {
      applySnapshot(entry.snapshot);
      requestAnimationFrame(() => window.scrollTo({ top: entry.scrollY, behavior: "instant" }));
    } else if (sameDiscoveryFilters(filters, normalizedInitial)) {
      window.history.replaceState(
        mergeDiscoveryHistoryState(window.history.state, createDiscoveryEntry(snapshotRef.current, window.scrollY)),
        "",
        window.location.href,
      );
    } else {
      void loadRef.current(filters);
    }
    const onPopState = (): void => restore();
    const onPageShow = (event: PageTransitionEvent): void => { if (event.persisted) restore(); };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      abortRef.current?.abort();
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
    // The location/history adapters are installed once; subsequent work goes through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dt-scene-actions">
      <RecordFilters
        filters={selected}
        availableTags={tags}
        disabled={status === "loading"}
        onChange={setSelected}
        onSubmit={() => { savePosition(); void load(selected, "push"); }}
        onClear={() => { savePosition(); void load(EMPTY_DISCOVERY_FILTERS, "push"); }}
      />
      <p className={styles.summary} aria-live="polite">
        {status === "loading" ? "正在读取公开记录…" : status === "error" ? "公开记录读取失败" : `${snapshot.records.items.length} 篇公开记录`}
      </p>
      {status === "loading" ? <p className={styles.loading} role="status">筛选条件已保留，正在更新列表。</p> : null}
      {status === "error" ? (
        <div className={styles.failure} role="alert">
          <p>暂时无法读取公开记录。服务失败不会显示成“无结果”。</p>
          <p className={styles.requestId}>错误码：{error?.code ?? "API_UNAVAILABLE"}{error?.requestId ? ` · requestId：${error.requestId}` : ""}</p>
          <Button type="button" variant="secondary" onClick={() => void load(selected)}>重试</Button>
        </div>
      ) : null}
      {status === "ready" || status === "empty" ? (
        <RecordList
          records={snapshot.records.items}
          {...(sameDiscoveryFilters(snapshot.filters, EMPTY_DISCOVERY_FILTERS) ? {} : { emptyMessage: "当前筛选没有公开记录。可以清除筛选后再查看。" })}
          onRecordClick={savePosition}
        />
      ) : null}
    </div>
  );
}
