"use client";

import { useEffect, useRef, useState } from "react";
import type { RecordListData, RecordType } from "@daytrace/contracts";
import { Button } from "@daytrace/ui/button";
import { Checkbox } from "@daytrace/ui/checkbox";
import { Select } from "@daytrace/ui/select";
import { Icon } from "@daytrace/ui/icon";
import {
  createDiscoveryUrl,
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

export function MobileArchive({ initialRecords, availableTags }: { readonly initialRecords: RecordListData; readonly availableTags: readonly string[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [selected, setSelected] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previousOverflow = useRef("");

  async function load(filters: DiscoveryFilters, push = true) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const result = await fetchPublicRecords(filters, controller.signal);
      if (controller.signal.aborted) return;
      setRecords(result.data);
      setSelected(filters);
      setStatus("ready");
      if (push) window.history.pushState({ ...window.history.state, daytraceH5Archive: null }, "", createDiscoveryUrl(window.location.pathname, window.location.search, filters));
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      setStatus("error");
    }
  }
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const initial = parseDiscoveryFilters(window.location.search);
    setSelected(initial);
    if (initial.type !== null || initial.tags.length > 0) void loadRef.current(initial, false);
    const onPopState = () => { const filters = parseDiscoveryFilters(window.location.search); setSelected(filters); void loadRef.current(filters, false); };
    window.addEventListener("popstate", onPopState);
    return () => { abortRef.current?.abort(); window.removeEventListener("popstate", onPopState); };
  }, []);

  function openSheet() {
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

  return <section className="h5-archive dt-scene-actions" aria-label="公开归档">
    <button ref={triggerRef} className="h5-filter-trigger" type="button" onClick={openSheet} aria-haspopup="dialog"><span><Icon name="archive" size={18} />筛选记录{activeLabels.length ? ` · ${activeLabels.length}` : ""}</span><span aria-hidden="true">⌁</span></button>
    <div className="h5-filter-summary" aria-live="polite"><span>{activeLabels.length ? activeLabels.join(" / ") : "全部公开记录"}</span><span>{records.items.length} 篇</span></div>
    {status === "loading" ? <p className="h5-status" role="status">正在翻找符合条件的记录…</p> : null}
    {status === "error" ? <div className="h5-error" role="alert"><p>读取失败，筛选条件还在。</p><Button variant="secondary" onClick={() => void load(selected)}>重新读取</Button></div> : null}
    {status !== "error" ? <MobileRecordList records={records.items} onRecordClick={() => window.history.replaceState({ ...window.history.state, daytraceH5Archive: { filters: selected, scrollY: window.scrollY } }, "", window.location.href)} /> : null}
    <dialog ref={element => { dialogRef.current = element; setDialogElement(element); }} className="h5-filter-sheet" aria-labelledby="h5-filter-title" onCancel={event => { event.preventDefault(); closeSheet(); }} onClick={event => { if (event.target === event.currentTarget) closeSheet(); }}>
      <form className="h5-filter-form" onSubmit={event => { event.preventDefault(); closeSheet(); void load(selected); }}>
        <div className="h5-sheet-top"><div><p className="h5-kicker">FILTER THE PAGES</p><h2 id="h5-filter-title">想翻哪一页？</h2></div><button type="button" aria-label="关闭筛选" onClick={closeSheet}><Icon name="close" /></button></div>
        <label className="h5-field-label" htmlFor="h5-record-type">记录类别</label>
        <Select id="h5-record-type" aria-label="记录类别" value={selected.type ?? "all"} options={typeOptions} disabled={status === "loading"} container={dialogElement} onValueChange={value => setSelected(normalizeDiscoveryFilters({ type: (value === "all" ? null : value) as RecordType | null, tags: selected.tags }))} />
        <fieldset className="h5-tag-field"><legend>标签 · 多选需同时满足</legend><div>{availableTags.map((tag, index) => { const checked = selected.tags.includes(tag); const id = `h5-tag-${index}`; return <span key={tag}><Checkbox id={id} aria-label={tag} checked={checked} onCheckedChange={() => setSelected(normalizeDiscoveryFilters({ type: selected.type, tags: checked ? selected.tags.filter(value => value !== tag) : [...selected.tags, tag] }))} /><label htmlFor={id}>#{tag}</label></span>; })}</div></fieldset>
        <div className="h5-sheet-actions"><Button type="submit" disabled={status === "loading"}>查看 {records.items.length} 篇记录</Button><Button variant="ghost" disabled={!activeLabels.length} onClick={() => { setSelected(EMPTY_DISCOVERY_FILTERS); closeSheet(); void load(EMPTY_DISCOVERY_FILTERS); }}>清除筛选</Button></div>
      </form>
    </dialog>
  </section>;
}
