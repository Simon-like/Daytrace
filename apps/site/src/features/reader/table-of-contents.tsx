"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@daytrace/contracts";
import { anchorIdFromHash, preferredScrollBehavior, resolveActiveHeadingId } from "./reader-interactions";
import styles from "./reader.module.css";

interface TableOfContentsProps {
  readonly items: readonly TocItem[];
  readonly marginNote?: string;
}

function focusHashTarget(hash: string, behavior: ScrollBehavior): void {
  const id = anchorIdFromHash(hash);
  if (id === null) return;
  const target = document.getElementById(id);
  if (target === null) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior, block: "start" });
}

export function TableOfContents({ items, marginNote }: TableOfContentsProps) {
  const mobileDetails = useRef<HTMLDetailsElement>(null);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (window.location.hash !== "") {
      focusHashTarget(window.location.hash, "auto");
    }
    const onHashChange = (): void => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      focusHashTarget(window.location.hash, preferredScrollBehavior(reduced));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const headings = items.flatMap((item) => {
      const element = document.getElementById(item.id);
      return element === null ? [] : [{ id: item.id, element }];
    });
    if (headings.length === 0) return;
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const positions = headings.map(({ id, element }) => ({ id, top: element.getBoundingClientRect().top }));
      const activationTop = Math.min(180, window.innerHeight * 0.24);
      const documentEndReached = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const nextId = resolveActiveHeadingId(positions, activationTop, documentEndReached);
      setActiveId((currentId) => currentId === nextId ? currentId : nextId);
    };
    const schedule = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  const followLink = (event: MouseEvent<HTMLAnchorElement>, id: string): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (target === null) return;
    event.preventDefault();
    setActiveId(id);
    const hash = `#${encodeURIComponent(id)}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    if (mobileDetails.current !== null) mobileDetails.current.open = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    focusHashTarget(hash, preferredScrollBehavior(reduced));
  };

  const links = (onNavigate?: () => void) => (
    <ol className={styles.tocList}>
      {items.map((item) => (
        <li key={item.id} className={styles.tocItem} data-level={item.level}>
          <a
            href={`#${item.id}`}
            aria-current={activeId === item.id ? "location" : undefined}
            onClick={(event) => {
              followLink(event, item.id);
              onNavigate?.();
            }}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <details ref={mobileDetails} className={styles.mobileToc}>
        <summary>
          <span>本文目录</span>
          <span className={styles.tocCount}>{items.length} 个小节</span>
        </summary>
        <nav aria-label="本文目录">{links()}</nav>
      </details>
      <aside className={styles.tocAside}>
        <nav aria-label="本文目录">
          <p className={styles.tocLabel}>ON THIS PAGE / 本文</p>
          {links()}
        </nav>
        {marginNote === undefined ? null : <p className={styles.marginNote}>{marginNote}</p>}
      </aside>
    </>
  );
}
