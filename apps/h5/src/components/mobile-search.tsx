"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@daytrace/ui/button";
import { Input } from "@daytrace/ui/input";
import { Icon } from "@daytrace/ui/icon";
import {
  createSearchUrl,
  fetchPublicSearch,
  initialSearchState,
  parseSearchLocation,
  SearchRequestError,
  searchReducer,
  type PublicSearchMatch,
} from "@daytrace/content/search";
import { TYPE_LABELS } from "./record-list";

function Highlight({ match }: { readonly match: PublicSearchMatch }) {
  const characters = Array.from(match.text);
  return <>{characters.map((character, index) => match.ranges.some(range => index >= range.start && index < range.start + range.length) ? <mark key={index}>{character}</mark> : character)}</>;
}

export function MobileSearch({ initialQuery }: { readonly initialQuery: string }) {
  const [state, dispatch] = useReducer(searchReducer, { ...initialSearchState, query: initialQuery.trim() });
  const [input, setInput] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function clear(push = true) {
    abortRef.current?.abort();
    dispatch({ type: "clear" });
    setInput("");
    if (push) window.history.pushState({ ...window.history.state, daytraceH5Search: null }, "", createSearchUrl(window.location.pathname, window.location.search, ""));
    inputRef.current?.focus();
  }
  async function run(query: string, push = true) {
    const normalized = query.trim();
    if (!normalized) { clear(push); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const attempt = stateRef.current.attempt + 1;
    dispatch({ type: "start", query: normalized });
    setInput(normalized);
    if (push) window.history.pushState({ ...window.history.state, daytraceH5Search: null }, "", createSearchUrl(window.location.pathname, window.location.search, normalized));
    try {
      const response = await fetchPublicSearch(normalized, controller.signal);
      if (!controller.signal.aborted) dispatch({ type: "success", attempt, result: response.data, contentRevision: response.meta.contentRevision });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      dispatch({ type: "failure", attempt, error: error instanceof SearchRequestError ? error.failure : { code: "API_UNAVAILABLE" } });
    }
  }
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const query = parseSearchLocation(window.location.search) || initialQuery.trim();
    if (query) void runRef.current(query, false);
    const onPopState = () => { const next = parseSearchLocation(window.location.search); if (next) void runRef.current(next, false); else clear(false); };
    window.addEventListener("popstate", onPopState);
    return () => { abortRef.current?.abort(); window.removeEventListener("popstate", onPopState); };
  }, []);

  return <section className="h5-search dt-scene-actions" aria-label="公开搜索">
    <form className="h5-search-form" role="search" onSubmit={event => { event.preventDefault(); void run(input); inputRef.current?.blur(); }}>
      <label htmlFor="h5-search-input">搜索标题、标签和正文</label>
      <div className="h5-search-desk"><Icon name="search" size={23} /><Input ref={inputRef} id="h5-search-input" type="search" value={input} maxLength={100} placeholder="输入一点线索" autoComplete="off" enterKeyHint="search" onChange={event => setInput(event.target.value)} />{input ? <button type="button" className="h5-search-clear" aria-label="清除搜索" onClick={() => clear()}><Icon name="close" size={15} /></button> : null}<Button type="submit" disabled={state.status === "loading"}>搜索</Button></div>
      <p><kbd>Enter</kbd> 只检索公开记录，私密内容仍留在主人空间。</p>
    </form>
    <nav className="h5-suggestions" aria-label="搜索建议"><span>不妨试试</span>{["微前端", "豆腐", "记录"].map(word => <Link key={word} href={`/search?q=${encodeURIComponent(word)}`} onClick={event => { event.preventDefault(); void run(word); }}>#{word}</Link>)}</nav>
    <div className="h5-search-status" aria-live="polite">{state.status === "loading" ? "正在循着这点点线索翻找…" : state.status === "results" ? `找到 ${state.result?.items.length ?? 0} 条相关记录` : state.status === "empty" ? "没有找到相符的公开记录" : state.status === "error" ? "搜索暂时不可用" : "从一个词开始就好"}</div>
    {state.status === "error" ? <div className="h5-error" role="alert"><p>服务失败不等于没有结果。</p><Button variant="secondary" onClick={() => void run(state.query, false)}>重新搜索</Button></div> : null}
    {state.result ? <ul className="h5-search-results">{state.result.items.map(item => <li key={item.record.id}><article><div className="h5-record-meta"><span>{TYPE_LABELS[item.record.type]}</span><time>{item.record.occurredOn ?? "未记日期"}</time></div><h2><Link href={`/records/${item.record.id}/`}>{item.record.title}</Link></h2>{item.matches.slice(0, 2).map((match, index) => <p className="h5-match" key={`${match.field}-${index}`}><span>{match.field === "title" ? "标题" : match.field === "tag" ? "标签" : "正文"}</span><span><Highlight match={match} /></span></p>)}</article></li>)}</ul> : null}
  </section>;
}
