"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import { fetchPublicSearch, SearchRequestError } from "./search-api";
import { SearchResults } from "./search-results";
import {
  createSearchUrl,
  initialSearchState,
  parseSearchLocation,
  searchReducer,
} from "./search-state";
import styles from "./search-panel.module.css";

interface SearchPanelProps {
  readonly initialQuery?: string;
  readonly onClose?: () => void;
}

type SearchNavigation = "push" | "none";

function savedScroll(value: unknown, query: string): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as { query?: unknown; scrollY?: unknown };
  return candidate.query === query && typeof candidate.scrollY === "number" && Number.isFinite(candidate.scrollY) && candidate.scrollY >= 0
    ? candidate.scrollY
    : undefined;
}

export function SearchPanel({ initialQuery = "", onClose }: SearchPanelProps) {
  const inputId = useId();
  const [state, dispatch] = useReducer(searchReducer, { ...initialSearchState, query: initialQuery.trim() });
  const [input, setInput] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef<(query: string, navigation?: SearchNavigation, restoreY?: number) => Promise<void>>(async () => {});
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
    dispatch({ type: "clear" });
    setInput("");
    if (push) {
      const url = createSearchUrl(window.location.pathname, window.location.search, "");
      window.history.pushState({ ...window.history.state, daytraceSearch: null }, "", url);
    }
    inputRef.current?.focus();
  }

  async function run(query: string, navigation: SearchNavigation = "none", restoreY?: number): Promise<void> {
    const normalized = query.trim();
    if (normalized.length === 0) {
      clear(navigation === "push");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setInput(normalized);
    const attempt = stateRef.current.attempt + 1;
    dispatch({ type: "start", query: normalized });
    if (Array.from(normalized).length > 100) {
      dispatch({ type: "failure", attempt, error: { code: "INVALID_QUERY" } });
      return;
    }
    if (navigation === "push") {
      const url = createSearchUrl(window.location.pathname, window.location.search, normalized);
      window.history.pushState({ ...window.history.state, daytraceSearch: null }, "", url);
    }
    try {
      const response = await fetchPublicSearch(normalized, controller.signal);
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
  runRef.current = run;

  useEffect(() => {
    const query = parseSearchLocation(window.location.search) || initialQuery.trim();
    if (query.length > 0) {
      void runRef.current(query, "none", savedScroll(window.history.state?.daytraceSearch, query));
    }
    const onPopState = (): void => {
      const next = parseSearchLocation(window.location.search);
      if (next.length === 0) clear(false);
      else void runRef.current(next, "none", savedScroll(window.history.state?.daytraceSearch, next));
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener("popstate", onPopState);
    };
    // Install the browser history adapter once; requests use the latest ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.panel} aria-label="公开搜索" data-content-revision={state.contentRevision ?? undefined}>
      <label className={styles.hint} htmlFor={inputId}>搜索公开记录的标题、标签和正文</label>
      <form
        className={styles.form}
        role="search"
        onSubmit={(event) => { event.preventDefault(); savePosition(); void run(input, "push"); }}
      >
        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            id={inputId}
            className={styles.input}
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
        <button className={styles.submit} type="submit" disabled={state.status === "loading"}>搜索</button>
      </form>
      {onClose === undefined ? null : <button type="button" className={styles.close} onClick={onClose}>关闭搜索</button>}
      <p className={styles.hint}>只检索明确公开的集合；即使浏览器带有 Cookie，也不会拼入主人记录。</p>
      <p className={styles.status} aria-live="polite">
        {state.status === "idle" ? "输入关键词开始查找。" :
          state.status === "loading" ? `正在搜索“${state.query}”…` :
          state.status === "empty" ? `没有找到与“${state.query}”匹配的公开记录。` :
          state.status === "results" ? `找到 ${state.result?.items.length ?? 0} 条当前页结果。` :
          state.status === "error" ? "搜索服务暂时失败，这不表示没有结果。" : ""}
      </p>
      {state.status === "error" ? (
        <div className={styles.failure} role="alert">
          <p>无法完成这次检索，请重试。</p>
          <p className={styles.requestId}>错误码：{state.error?.code ?? "API_UNAVAILABLE"}{state.error?.requestId ? ` · requestId：${state.error.requestId}` : ""}</p>
          <button type="button" className={styles.retry} onClick={() => void run(state.query)}>重试搜索</button>
        </div>
      ) : null}
      {state.status === "results" && state.result !== null ? <SearchResults items={state.result.items} onRecordClick={savePosition} /> : null}
    </section>
  );
}
