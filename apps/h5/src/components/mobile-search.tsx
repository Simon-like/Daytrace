"use client";

import Link from "next/link";
import { useEffect, useId, useReducer, useRef, useState } from "react";
import { Button } from "@daytrace/ui/button";
import { Input } from "@daytrace/ui/input";
import { Icon } from "@daytrace/ui/icon";
import {
  createSearchUrl,
  EMPTY_SEARCH_FILTERS,
  normalizeSearchFilters,
  parseSearchFilters,
  type SearchFilters,
  fetchSearch,
  initialSearchState,
  parseSearchLocation,
  SearchRequestError,
  searchReducer,
  type PublicSearchMatch,
  type SearchScope,
} from "@daytrace/content/search";
import { TYPE_LABELS } from "./record-list";

function Highlight({ match }: { readonly match: PublicSearchMatch }) {
  const characters = Array.from(match.text);
  return <>{characters.map((character, index) => match.ranges.some(range => index >= range.start && index < range.start + range.length) ? <mark key={index}>{character}</mark> : character)}</>;
}

export function MobileSearch({ initialQuery, scope = "public" }: { readonly initialQuery: string; readonly scope?: SearchScope }) {
  const inputId = useId();
  const owner = scope === "owner";
  const [state, dispatch] = useReducer(searchReducer, { ...initialSearchState, query: initialQuery.trim() });
  const [input, setInput] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_SEARCH_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  const attemptRef = useRef(0);
  stateRef.current = state;

  function clear(push = true) {
    abortRef.current?.abort();
    attemptRef.current += 1;
    dispatch({ type: "clear" });
    setInput("");
    if (push) window.history.pushState({ ...window.history.state, daytraceH5Search: null }, "", createSearchUrl(window.location.pathname, window.location.search, "", filters, owner));
    inputRef.current?.focus();
  }
  async function run(query: string, push = true, nextFilters: SearchFilters = filters) {
    const normalizedFilters = normalizeSearchFilters(nextFilters, owner);
    setFilters(normalizedFilters);
    const normalized = query.trim();
    if (!normalized) { clear(push); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const attempt = ++attemptRef.current;
    dispatch({ type: "start", query: normalized, filters: normalizedFilters });
    setInput(normalized);
    if (Array.from(normalized).length > 100) { dispatch({ type: "failure", attempt, error: { code: "INVALID_QUERY" } }); return; }
    if (push) window.history.pushState({ ...window.history.state, daytraceH5Search: null }, "", createSearchUrl(window.location.pathname, window.location.search, normalized, normalizedFilters, owner));
    try {
      const response = await fetchSearch(normalized, scope, controller.signal, undefined, normalizedFilters);
      if (!controller.signal.aborted) dispatch({ type: "success", attempt, result: response.data, contentRevision: response.meta.contentRevision });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      dispatch({ type: "failure", attempt, error: error instanceof SearchRequestError ? error.failure : { code: "API_UNAVAILABLE" } });
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
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const initialFilters = parseSearchFilters(window.location.search, owner); setFilters(initialFilters);
    const query = parseSearchLocation(window.location.search) || initialQuery.trim();
    if (query) void runRef.current(query, false, initialFilters);
    const onPopState = () => { const next = parseSearchLocation(window.location.search); const nextFilters = parseSearchFilters(window.location.search, owner); setFilters(nextFilters); if (next) void runRef.current(next, false, nextFilters); else clear(false); };
    window.addEventListener("popstate", onPopState);
    return () => { abortRef.current?.abort(); window.removeEventListener("popstate", onPopState); };
  }, []);
  const expired = owner && state.error?.code === "AUTH_REQUIRED";

  return <section className="h5-search dt-scene-actions" aria-label={owner ? "主人搜索" : "公开搜索"} data-content-revision={state.contentRevision ?? undefined}>
    <form className="h5-search-form" role="search" onSubmit={event => { event.preventDefault(); void run(input); inputRef.current?.blur(); }}>
      <label htmlFor={inputId}>{owner ? "搜索全部主人记录的标题、标签和正文" : "搜索标题、标签和正文"}</label>
      <div className="h5-search-desk"><Icon name="search" size={23} /><Input ref={inputRef} id={inputId} type="search" value={input} maxLength={100} placeholder="输入一点线索" autoComplete="off" enterKeyHint="search" onChange={event => setInput(event.target.value)} />{input ? <button type="button" className="h5-search-clear" aria-label="清除搜索" onClick={() => clear()}><Icon name="close" size={15} /></button> : null}<Button type="submit" disabled={state.status === "loading"}>搜索</Button></div>
      <p><kbd>Enter</kbd> {owner ? "检索公开、私密与草稿，结果不会进入公开索引。" : "只检索公开记录，私密内容仍留在主人空间。"}</p>
    </form>
    <div className="h5-search-filters" aria-label="搜索筛选">
      <label>记录类型<select aria-label="搜索记录类型" value={filters.type ?? ""} onChange={event => setFilters({ ...filters, type: (event.target.value || null) as SearchFilters["type"] })}><option value="">全部类型</option><option value="engineering">技术实践</option><option value="recipe">生活经验</option><option value="reflection">随想认知</option></select></label>
      {owner ? <><label>状态<select aria-label="搜索记录状态" value={filters.status ?? ""} onChange={event => setFilters({ ...filters, status: (event.target.value || null) as SearchFilters["status"] })}><option value="">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已归档</option></select></label><label>公开范围<select aria-label="搜索公开范围" value={filters.visibility ?? ""} onChange={event => setFilters({ ...filters, visibility: (event.target.value || null) as SearchFilters["visibility"] })}><option value="">全部范围</option><option value="public">公开</option><option value="private">私密</option></select></label></> : null}
    </div>
    <p className="h5-search-filter-hint">选择条件后，点击搜索应用。</p>
    {owner ? null : <nav className="h5-suggestions" aria-label="搜索建议"><span>不妨试试</span>{["微前端", "豆腐", "记录"].map(word => <Link key={word} href={`/search?q=${encodeURIComponent(word)}`} onClick={event => { event.preventDefault(); void run(word); }}>#{word}</Link>)}</nav>}
    <div className="h5-search-status" aria-live="polite">{state.status === "loading" ? "正在循着这点点线索翻找…" : state.status === "results" ? `已显示 ${state.result?.items.length ?? 0} 条相关记录` : state.status === "empty" ? `没有找到相符的${owner ? "主人" : "公开"}记录` : expired ? "主人会话已失效，私密结果已清除" : state.status === "error" ? "搜索暂时不可用" : "从一个词开始就好"}</div>
    {state.status === "error" ? <div className="h5-error" role="alert"><p>{expired ? "请重新登录后再检索主人记录。" : "服务失败不等于没有结果。"}</p>{expired ? <a className="h5-text-link" href="/api/v1/auth/login?returnTo=/h5/owner">重新登录主人空间 ↗</a> : <Button variant="secondary" onClick={() => void run(state.query, false, state.filters)}>重新搜索</Button>}</div> : null}
    {state.result ? <ul className="h5-search-results" aria-label={owner ? "主人搜索结果" : "公开搜索结果"}>{state.result.items.map(item => <li key={item.record.id}><article><div className="h5-record-meta"><span>{TYPE_LABELS[item.record.type]}{owner ? ` · ${item.record.status === "draft" ? "草稿" : item.record.visibility === "private" ? "私密" : "公开"}` : ""}</span><time>{item.record.occurredOn ?? "未记日期"}</time></div><h2><Link href={`${owner ? "/owner/records" : "/records"}/${item.record.id}/`}>{item.record.title}</Link></h2>{item.matches.slice(0, 2).map((match, index) => <p className="h5-match" key={`${match.field}-${index}`}><span>{match.field === "title" ? "标题" : match.field === "tag" ? "标签" : "正文"}</span><span><Highlight match={match} /></span></p>)}</article></li>)}</ul> : null}
    {state.status === "results" && state.result?.pageInfo.hasMore ? <div><Button variant="secondary" disabled={state.moreStatus === "loading"} onClick={() => void loadMore()}>{state.moreStatus === "loading" ? "正在读取…" : state.moreStatus === "error" ? "重试加载更多" : "加载更多"}</Button>{state.moreStatus === "error" ? <><p role="alert">加载失败，结果可能已更新。</p><Button variant="ghost" onClick={() => void run(state.query, false, state.filters)}>从头搜索</Button></> : null}</div> : null}
  </section>;
}
