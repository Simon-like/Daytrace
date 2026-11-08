"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import { Button, Input } from "../../components/ui";
import { fetchSearch, SearchRequestError, type SearchScope } from "./search-api";
import { SearchResults } from "./search-results";
import {
  createSearchUrl,
  EMPTY_SEARCH_FILTERS,
  normalizeSearchFilters,
  parseSearchFilters,
  type SearchFilters,
  initialSearchState,
  parseSearchLocation,
  searchReducer,
} from "./search-state";
import styles from "./search-panel.module.css";

interface SearchPanelProps {
  readonly initialQuery?: string;
  readonly onClose?: () => void;
  readonly scope?: SearchScope;
}

type SearchNavigation = "push" | "none";

function savedScroll(value: unknown, query: string): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { query?: unknown; scrollY?: unknown };
  return candidate.query === query && typeof candidate.scrollY === "number" && Number.isFinite(candidate.scrollY) && candidate.scrollY >= 0
    ? candidate.scrollY
    : undefined;
}

export function SearchPanel({ initialQuery = "", onClose, scope = "public" }: SearchPanelProps) {
  const inputId = useId();
  const [state, dispatch] = useReducer(searchReducer, { ...initialSearchState, query: initialQuery.trim() });
  const [input, setInput] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_SEARCH_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  const attemptRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef<(query: string, navigation?: SearchNavigation, restoreY?: number, filters?: SearchFilters) => Promise<void>>(async () => {});
  stateRef.current = state;

  function savePosition(): void {
    const query = stateRef.current.query;
    if (query.length === 0) return;
    window.history.replaceState({
      ...window.history.state,
      daytraceSearch: { query, scrollY: window.scrollY },
    }, "", window.location.href);
  }

  function clear(push = true): void {
    abortRef.current?.abort();
    attemptRef.current += 1;
    dispatch({ type: "clear" });
    setInput("");
    if (push) {
      const url = createSearchUrl(window.location.pathname, window.location.search, "", filters, scope === "owner");
      window.history.pushState({ ...window.history.state, daytraceSearch: null }, "", url);
    }
    inputRef.current?.focus();
  }

  async function run(query: string, navigation: SearchNavigation = "none", restoreY?: number, nextFilters: SearchFilters = filters): Promise<void> {
    const normalizedFilters = normalizeSearchFilters(nextFilters, scope === "owner");
    setFilters(normalizedFilters);
    const normalized = query.trim();
    if (normalized.length === 0) {
      clear(navigation === "push");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setInput(normalized);
    const attempt = ++attemptRef.current;
    dispatch({ type: "start", query: normalized, filters: normalizedFilters });
    if (Array.from(normalized).length > 100) {
      dispatch({ type: "failure", attempt, error: { code: "INVALID_QUERY" } });
      return;
    }
    if (navigation === "push") {
      const url = createSearchUrl(window.location.pathname, window.location.search, normalized, normalizedFilters, scope === "owner");
      window.history.pushState({ ...window.history.state, daytraceSearch: null }, "", url);
    }
    try {
      const response = await fetchSearch(normalized, scope, controller.signal, undefined, normalizedFilters);
      if (controller.signal.aborted) return;
      dispatch({ type: "success", attempt, result: response.data, contentRevision: response.meta.contentRevision });
      window.history.replaceState({
        ...window.history.state,
        daytraceSearch: { query: normalized, scrollY: restoreY ?? 0 },
      }, "", window.location.href);
      if (restoreY !== undefined) requestAnimationFrame(() => window.scrollTo({ top: restoreY, behavior: "instant" }));
    } catch (cause: unknown) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) return;
      dispatch({
        type: "failure",
        attempt,
        error: cause instanceof SearchRequestError ? cause.failure : { code: "API_UNAVAILABLE" },
      });
    }
  }
  async function loadMore(): Promise<void> {
    const current = stateRef.current;
    const cursor = current.result?.pageInfo.nextCursor;
    if (!cursor || current.moreStatus === "loading" || current.status !== "results") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "more-start", attempt: current.attempt });
    try {
      const response = await fetchSearch(current.query, scope, controller.signal, cursor, current.filters);
      if (!controller.signal.aborted) dispatch({ type: "more-success", attempt: current.attempt, result: response.data, contentRevision: response.meta.contentRevision });
    } catch (cause: unknown) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) return;
      dispatch({ type: "more-failure", attempt: current.attempt, error: cause instanceof SearchRequestError ? cause.failure : { code: "API_UNAVAILABLE" } });
    }
  }
  runRef.current = run;

  useEffect(() => {
    const initialFilters = parseSearchFilters(window.location.search, scope === "owner");
    setFilters(initialFilters);
    const query = parseSearchLocation(window.location.search) || initialQuery.trim();
    if (query.length > 0) {
      void runRef.current(query, "none", savedScroll(window.history.state?.daytraceSearch, query), initialFilters);
    }
    const onPopState = (): void => {
      const next = parseSearchLocation(window.location.search);
      const nextFilters = parseSearchFilters(window.location.search, scope === "owner");
      setFilters(nextFilters);
      if (next.length === 0) clear(false);
      else void runRef.current(next, "none", savedScroll(window.history.state?.daytraceSearch, next), nextFilters);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener("popstate", onPopState);
    };
    // Install the browser history adapter once; requests use the latest ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owner = scope === "owner";
  const expired = owner && state.error?.code === "AUTH_REQUIRED";
  return (
    <section className={`${styles.panel} dt-scene-actions`} aria-label={owner ? "主人搜索" : "公开搜索"} data-content-revision={state.contentRevision ?? undefined}>
      <label className="mb-3 block text-sm text-muted" htmlFor={inputId}>{owner ? "搜索全部主人记录的标题、标签和正文" : "搜索公开记录的标题、标签和正文"}</label>
      <form
        className={styles.form}
        role="search"
        onSubmit={(event) => { event.preventDefault(); savePosition(); void run(input, "push"); }}
      >
        <div className={styles.inputWrap}>
          <svg className={styles.searchIcon} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><circle cx="14.5" cy="14.5" r="5.75" stroke="currentColor" strokeWidth="1.4" /><path d="m19 19 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <Input
            ref={inputRef}
            id={inputId}
            className="h-12 rounded-[12px] border-0 bg-transparent pl-12 pr-11 text-[17px] shadow-none hover:border-0 focus:border-0 focus:bg-transparent focus-visible:outline-none"
            type="search"
            value={input}
            maxLength={100}
            autoComplete="off"
            placeholder="例如：微前端、豆腐、registerMicroApps"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              if (input.length > 0) clear();
              else onClose?.();
            }}
          />
          {input.length === 0 ? null : <button type="button" className={styles.clear} aria-label="清除搜索" onClick={() => clear()}>×</button>}
        </div>
        <Button className="h-12 min-w-[108px] rounded-[13px] px-4" type="submit" disabled={state.status === "loading"}>搜索</Button>
      </form>
      <div className={styles.filters} aria-label="搜索筛选">
        <label>记录类型<select aria-label="搜索记录类型" value={filters.type ?? ""} onChange={event => setFilters({ ...filters, type: (event.target.value || null) as SearchFilters["type"] })}><option value="">全部类型</option><option value="engineering">技术实践</option><option value="recipe">生活经验</option><option value="reflection">随想认知</option></select></label>
        {owner ? <><label>状态<select aria-label="搜索记录状态" value={filters.status ?? ""} onChange={event => setFilters({ ...filters, status: (event.target.value || null) as SearchFilters["status"] })}><option value="">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已归档</option></select></label><label>公开范围<select aria-label="搜索公开范围" value={filters.visibility ?? ""} onChange={event => setFilters({ ...filters, visibility: (event.target.value || null) as SearchFilters["visibility"] })}><option value="">全部范围</option><option value="public">公开</option><option value="private">私密</option></select></label></> : null}
      </div>
      <p className={styles.hint}>选择条件后，点击搜索应用。</p>
      {onClose === undefined ? null : <Button variant="secondary" className="mt-3" onClick={onClose}>关闭搜索</Button>}
      <p className={styles.hint}><kbd>Enter</kbd> {owner ? "检索公开、私密与草稿；结果不会进入公开索引。" : "检索公开记录，私密内容仍只留在主人空间。"}</p>
      <p className={styles.status} aria-live="polite">
        {state.status === "idle" ? "输入关键词开始查找。" :
          state.status === "loading" ? `正在搜索“${state.query}”…` :
          state.status === "empty" ? `没有找到与“${state.query}”匹配的${owner ? "主人" : "公开"}记录。` :
          state.status === "results" ? `已显示 ${state.result?.items.length ?? 0} 条结果。` :
          expired ? "主人会话已失效，私密结果已清除。" :
          state.status === "error" ? "搜索服务暂时失败，这不表示没有结果。" : ""}
      </p>
      {state.status === "error" ? (
        <div className={styles.failure} role="alert">
          <p>{expired ? "请重新登录后再检索主人记录。" : "无法完成这次检索，请重试。"}</p>
          <p className={styles.requestId}>错误码：{state.error?.code ?? "API_UNAVAILABLE"}{state.error?.requestId ? ` · requestId：${state.error.requestId}` : ""}</p>
          {expired ? <a className="text-link" href="/api/v1/auth/login?returnTo=/owner">重新登录主人空间 ↗</a> : <Button type="button" variant="secondary" onClick={() => void run(state.query, "none", undefined, state.filters)}>重试搜索</Button>}
        </div>
      ) : null}
      {state.status === "results" && state.result !== null ? <SearchResults items={state.result.items} onRecordClick={savePosition} scope={scope} /> : null}
      {state.status === "results" && state.result?.pageInfo.hasMore ? <div>
        <Button type="button" variant="secondary" disabled={state.moreStatus === "loading"} onClick={() => void loadMore()}>{state.moreStatus === "loading" ? "正在读取…" : state.moreStatus === "error" ? "重试加载更多" : "加载更多"}</Button>
        {state.moreStatus === "error" ? <><p role="alert">加载失败，结果可能已更新。</p><Button type="button" variant="ghost" onClick={() => void run(state.query, "none", undefined, state.filters)}>从头搜索</Button></> : null}
      </div> : null}
    </section>
  );
}
