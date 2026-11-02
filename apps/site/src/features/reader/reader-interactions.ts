export type CopyResult = "copied" | "failed";

export interface CodeTextSource {
  readonly textContent: string | null;
}

export interface ViewportSnapshot {
  readonly left: number;
  readonly top: number;
}

export interface ViewportWindow {
  readonly scrollX: number;
  readonly scrollY: number;
  scrollTo(options: ScrollToOptions): void;
}

export interface FocusTarget {
  focus(options?: FocusOptions): void;
}

export function anchorIdFromHash(hash: string): string | null {
  if (!hash.startsWith("#") || hash.length === 1) return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
}

export function preferredScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}

/** Copy only the code node's own text; toolbar labels and external line numbers never enter it. */
export async function copyCodeText(
  source: CodeTextSource,
  writeText: (text: string) => Promise<void>,
): Promise<CopyResult> {
  const text = source.textContent;
  if (text === null || text.length === 0) return "failed";
  try {
    await writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export function captureViewport(window: ViewportWindow): ViewportSnapshot {
  return { left: window.scrollX, top: window.scrollY };
}

/** Restore scroll before focusing; preventScroll keeps the focus step from moving the reader again. */
export function restoreFocusAndScroll(
  target: FocusTarget | null,
  viewport: ViewportSnapshot,
  window: ViewportWindow,
): void {
  window.scrollTo({ left: viewport.left, top: viewport.top, behavior: "auto" });
  target?.focus({ preventScroll: true });
}
