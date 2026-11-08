import { copyCodeText } from "./reader-interactions";

export interface BodyClassNames {
  readonly hasImageError: string;
}

type Cleanup = () => void;

function observeOverflow(scroller: HTMLElement, hint: HTMLElement | null): Cleanup {
  const update = (): void => {
    const overflows = scroller.scrollWidth > scroller.clientWidth + 1;
    scroller.dataset.overflow = String(overflows);
    if (hint !== null) hint.dataset.overflow = String(overflows);
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
  observer?.observe(scroller);
  window.addEventListener("resize", update);
  update();
  return () => {
    observer?.disconnect();
    window.removeEventListener("resize", update);
    delete scroller.dataset.overflow;
    if (hint !== null) delete hint.dataset.overflow;
  };
}

async function fallbackCopy(document: Document, text: string): Promise<void> {
  const textarea = document.createElement("textarea");
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  document.body.append(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("COPY_COMMAND_REJECTED");
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
  }
}

async function writeWithFallback(document: Document, text: string): Promise<void> {
  const clipboard = document.defaultView?.navigator.clipboard;
  if (clipboard !== undefined) {
    try {
      await clipboard.writeText(text);
      return;
    } catch {
      // A denied modern permission can still succeed through the explicit fallback gesture.
    }
  }
  await fallbackCopy(document, text);
}

function selectCode(code: HTMLElement): void {
  const document = code.ownerDocument;
  const selection = document.defaultView?.getSelection();
  if (selection === null || selection === undefined) return;
  const range = document.createRange();
  range.selectNodeContents(code);
  selection.removeAllRanges();
  selection.addRange(range);
}

function enhanceCode(wrapper: HTMLElement): Cleanup {
  const document = wrapper.ownerDocument;
  const pre = wrapper.querySelector<HTMLPreElement>("pre[data-reader-code-scroll]");
  const code = pre?.querySelector<HTMLElement>("code");
  const button = wrapper.querySelector<HTMLButtonElement>("button[data-code-copy]");
  const hint = wrapper.querySelector<HTMLElement>("[data-scroll-hint]");
  if (pre == null || code == null || button == null) return () => undefined;

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let copying = false;
  let active = true;
  const onCopy = async (): Promise<void> => {
    if (copying) return;
    copying = true;
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    button.setAttribute("aria-busy", "true");
    button.textContent = "复制中…";
    const result = await copyCodeText(code, (text) => writeWithFallback(document, text));
    if (!active) return;
    button.removeAttribute("aria-busy");
    button.textContent = result === "copied" ? "已复制" : "复制失败，请手动复制";
    button.dataset.copyState = result;
    if (result === "failed") selectCode(code);
    copying = false;
    resetTimer = setTimeout(() => {
      button.textContent = "复制代码";
      delete button.dataset.copyState;
    }, 2_600);
  };
  button.addEventListener("click", onCopy);
  const stopObserving = observeOverflow(pre, hint);
  return () => {
    active = false;
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    button.removeEventListener("click", onCopy);
    stopObserving();
  };
}

function enhanceImage(button: HTMLButtonElement, classes: BodyClassNames): Cleanup {
  const image = button.querySelector<HTMLImageElement>("img");
  const error = button.querySelector<HTMLElement>("[data-image-error]");
  if (image == null || error == null) return () => undefined;
  const onError = (): void => {
    button.classList.add(classes.hasImageError);
    error.textContent = `图片暂时无法显示${image.alt === "" ? "。" : `：${image.alt}`}`;
  };
  image.addEventListener("error", onError);
  if (image.complete && image.naturalWidth === 0) onError();
  return () => {
    image.removeEventListener("error", onError);
    button.classList.remove(classes.hasImageError);
  };
}

/** Bind behavior to stable server-rendered semantics; hydration never wraps or moves record content. */
export function enhanceRecordBody(root: HTMLElement, classes: BodyClassNames): Cleanup {
  const cleanups: Cleanup[] = [];
  for (const wrapper of Array.from(root.querySelectorAll<HTMLElement>("[data-reader-code]"))) {
    cleanups.push(enhanceCode(wrapper));
  }
  for (const scroller of Array.from(root.querySelectorAll<HTMLElement>("[data-reader-table]"))) {
    cleanups.push(observeOverflow(scroller, scroller.querySelector<HTMLElement>("[data-scroll-hint]")));
  }
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-reader-image]"))) {
    cleanups.push(enhanceImage(button, classes));
  }
  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
