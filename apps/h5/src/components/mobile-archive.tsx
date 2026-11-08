"use client";

import { useEffect, useRef, useState } from "react";
import type { RecordListData, RecordType } from "@daytrace/contracts";
import { Button } from "@daytrace/ui/button";
import { Checkbox } from "@daytrace/ui/checkbox";
import { Select } from "@daytrace/ui/select";
import { Icon } from "@daytrace/ui/icon";
import {
  createDiscoveryUrl,
  createDiscoveryEntry,
  readDiscoveryEntry,
  sameDiscoveryFilters,
  EMPTY_DISCOVERY_FILTERS,
  fetchPublicRecords,
  normalizeDiscoveryFilters,
  parseDiscoveryFilters,
  type DiscoveryFilters,
} from "@daytrace/content/records";
import { MobileRecordList, TYPE_LABELS } from "./record-list";

const typeOptions = [
  { value: "all", label: "全部类别" },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function MobileArchive({ initialRecords, availableTags, tagsComplete = true }: { readonly initialRecords: RecordListData; readonly availableTags: readonly string[]; readonly tagsComplete?: boolean }) {
  const [records, setRecords] = useState(initialRecords);
  const [contentRevision, setContentRevision] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [moreStatus, setMoreStatus] = useState<"idle" | "loading" | "error">("idle");
  const [applied, setApplied] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previousOverflow = useRef("");

  function savePosition() {
    if (status !== "ready") return;
    const entry = createDiscoveryEntry({ filters: applied, records, contentRevision }, window.scrollY);
    window.history.replaceState({ ...window.history.state, daytraceH5Archive: entry }, "", window.location.href);
  }

  async function load(filters: DiscoveryFilters, push = true) {
    if (push) savePosition();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setMoreStatus("idle");
    try {
      const result = await fetchPublicRecords(filters, controller.signal);
      if (controller.signal.aborted) return;
      setRecords(result.data);
      setContentRevision(result.contentRevision);
      setSelected(filters);
      setApplied(filters);
      setStatus("ready");
      if (push) window.history.pushState({ ...window.history.state, daytraceH5Archive: null }, "", createDiscoveryUrl(window.location.pathname, window.location.search, filters));
      const entry = createDiscoveryEntry({ filters, records: result.data, contentRevision: result.contentRevision }, 0);
      window.history.replaceState({ ...window.history.state, daytraceH5Archive: entry }, "", window.location.href);
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      setStatus("error");
    }
  }
  async function loadMore() {
    const cursor = records.pageInfo.nextCursor;
    if (!cursor || moreStatus === "loading") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setMoreStatus("loading");
    try {
      const result = await fetchPublicRecords(applied, controller.signal, cursor);
      if (controller.signal.aborted) return;
      setRecords(current => ({ items: [...current.items, ...result.data.items], pageInfo: result.data.pageInfo }));
      setContentRevision(result.contentRevision);
      setMoreStatus("idle");
    } catch {
      if (!controller.signal.aborted) setMoreStatus("error");
    }
  }
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const restore = (initial: boolean) => {
      abortRef.current?.abort();
      const filters = parseDiscoveryFilters(window.location.search);
      const entry = readDiscoveryEntry(window.history.state?.daytraceH5Archive);
      if (entry && sameDiscoveryFilters(entry.snapshot.filters, filters)) {
        setRecords(entry.snapshot.records);
        setContentRevision(entry.snapshot.contentRevision);
        setSelected(filters);
        setApplied(filters);
        setStatus("ready");
        setMoreStatus("idle");
        requestAnimationFrame(() => window.scrollTo({ top: entry.scrollY, behavior: "instant" }));
      } else if (!initial || filters.type !== null || filters.tags.length > 0) {
        setSelected(filters);
        void loadRef.current(filters, false);
      }
    };
    restore(true);
    const onPopState = () => restore(false);
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) restore(false); };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => { abortRef.current?.abort(); window.history.scrollRestoration = previousRestoration; window.removeEventListener("popstate", onPopState); window.removeEventListener("pageshow", onPageShow); };
  }, []);

  function openSheet() {
    setSelected(applied);
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.showModal();
  }
  function closeSheet() {
    dialogRef.current?.close();
    document.body.style.overflow = previousOverflow.current;
    triggerRef.current?.focus({ preventScroll: true });
  }
  const activeLabels = [selected.type ? TYPE_LABELS[selected.type] : null, ...selected.tags].filter((value): value is string => value !== null);

  const appliedLabels = [applied.type ? TYPE_LABELS[applied.type] : null, ...applied.tags].filter((value): value is string => value !== null);

  return <section className="h5-archive dt-scene-actions" aria-label="公开归档">
    <button ref={triggerRef} className="h5-filter-trigger" type="button" onClick={openSheet} aria-haspopup="dialog"><span><Icon name="archive" size={18} />筛选记录{appliedLabels.length ? ` · ${appliedLabels.length}` : ""}</span><span aria-hidden="true">⌁</span></button>
    {!tagsComplete ? <p role="status">部分标签暂时无法读取，刷新页面可重试。</p> : null}
    <div className="h5-filter-summary" aria-live="polite"><span>{appliedLabels.length ? appliedLabels.join(" / ") : "全部公开记录"}</span><span>已显示 {records.items.length} 篇</span></div>
    {status === "loading" ? <p className="h5-status" role="status">正在翻找符合条件的记录…</p> : null}
    {status === "error" ? <div className="h5-error" role="alert"><p>读取失败，筛选条件还在。</p><Button variant="secondary" onClick={() => void load(selected)}>重新读取</Button></div> : null}
    {status !== "error" ? <MobileRecordList records={records.items} onRecordClick={savePosition} /> : null}
    {status === "ready" && records.pageInfo.hasMore ? <div><Button variant="secondary" disabled={moreStatus === "loading"} onClick={() => void loadMore()}>{moreStatus === "loading" ? "正在读取…" : moreStatus === "error" ? "重试加载更多" : "加载更多"}</Button>{moreStatus === "error" ? <p role="alert">加载失败，记录可能已更新。可重试或重新筛选。</p> : null}{moreStatus === "error" ? <Button variant="ghost" onClick={() => void load(applied, false)}>从头读取</Button> : null}</div> : null}
    <dialog ref={element => { dialogRef.current = element; setDialogElement(element); }} className="h5-filter-sheet" aria-labelledby="h5-filter-title" onCancel={event => { event.preventDefault(); closeSheet(); }} onClick={event => { if (event.target === event.currentTarget) closeSheet(); }}>
      <form className="h5-filter-form" onSubmit={event => { event.preventDefault(); closeSheet(); void load(selected); }}>
        <div className="h5-sheet-top"><div><p className="h5-kicker">FILTER THE PAGES</p><h2 id="h5-filter-title">想翻哪一页？</h2></div><button type="button" aria-label="关闭筛选" onClick={closeSheet}><Icon name="close" /></button></div>
        <label className="h5-field-label" htmlFor="h5-record-type">记录类别</label>
        <Select id="h5-record-type" aria-label="记录类别" value={selected.type ?? "all"} options={typeOptions} disabled={status === "loading"} container={dialogElement} onValueChange={value => setSelected(normalizeDiscoveryFilters({ type: (value === "all" ? null : value) as RecordType | null, tags: selected.tags }))} />
        {availableTags.length > 0 ? <fieldset className="h5-tag-field"><legend>标签 · 多选需同时满足</legend><div>{availableTags.map((tag, index) => { const checked = selected.tags.includes(tag); const id = `h5-tag-${index}`; return <span key={tag}><Checkbox id={id} aria-label={tag} checked={checked} onCheckedChange={() => setSelected(normalizeDiscoveryFilters({ type: selected.type, tags: checked ? selected.tags.filter(value => value !== tag) : [...selected.tags, tag] }))} /><label htmlFor={id}>#{tag}</label></span>; })}</div></fieldset> : null}
        <div className="h5-sheet-actions"><Button type="submit" disabled={status === "loading"}>查看记录</Button><Button variant="ghost" disabled={!activeLabels.length} onClick={() => { setSelected(EMPTY_DISCOVERY_FILTERS); closeSheet(); void load(EMPTY_DISCOVERY_FILTERS); }}>清除筛选</Button></div>
      </form>
    </dialog>
  </section>;
}
