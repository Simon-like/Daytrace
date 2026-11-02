import type { ReactNode } from "react";
import type { PublicSearchMatch } from "./search-contract";

export function HighlightedText({ text, ranges }: Pick<PublicSearchMatch, "text" | "ranges">) {
  const points = Array.from(text);
  const marked = new Set<number>();
  ranges.forEach((range) => {
    for (let index = range.start; index < range.start + range.length && index < points.length; index += 1) marked.add(index);
  });
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < points.length) {
    const isMarked = marked.has(index);
    let end = index + 1;
    while (end < points.length && marked.has(end) === isMarked) end += 1;
    const value = points.slice(index, end).join("");
    nodes.push(isMarked ? <mark key={`${index}-${end}`}>{value}</mark> : value);
    index = end;
  }
  return <>{nodes}</>;
}
