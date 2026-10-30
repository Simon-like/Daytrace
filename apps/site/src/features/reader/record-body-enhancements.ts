import { copyCodeText } from "./reader-interactions";

export interface BodyClassNames {
  readonly codeBlock: string;
  readonly codeToolbar: string;
  readonly codeLanguage: string;
  readonly copyButton: string;
  readonly scrollHint: string;
  readonly tableScroll: string;
  readonly imageButton: string;
  readonly imageError: string;
  readonly hasImageError: string;
}

type Cleanup = () => void;

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function unwrap(element: Element, wrapper: Element): void {
  wrapper.before(element);
  wrapper.remove();
}

function observeOverflow(
  scroller: HTMLElement,
  hint: HTMLElement,
  onChange: () => void,
): Cleanup {
  const update = (): void => {
    const overflows = scroller.scrollWidth > scroller.clientWidth + 1;
    scroller.dataset.overflow = String(overflows);
    hint.dataset.overflow = String(overflows);
    onChange();
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
  observer?.observe(scroller);
  window.addEventListener("resize", update);
  update();
  return () => {
    observer?.disconnect();
    window.removeEventListener("resize", update);
    delete scroller.dataset.overflow;
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

function enhanceCode(pre: HTMLPreElement, classes: BodyClassNames): Cleanup {
  const document = pre.ownerDocument;
  const code = pre.querySelector<HTMLElement>("code") ?? pre;
  const wrapper = document.createElement("div");
  const toolbar = document.createElement("div");
  const language = document.createElement("span");
  const button = document.createElement("button");
  const hint = document.createElement("span");
  const languageClass = Array.from(code.classList).find((name) => name.startsWith("language-"));
  const languageName = languageClass?.slice("language-".length);

  wrapper.className = classes.codeBlock;
  toolbar.className = classes.codeToolbar;
  language.className = classes.codeLanguage;
  language.textContent = languageName === undefined || languageName === "" ? "CODE" : languageName.toUpperCase();
  button.className = classes.copyButton;
  button.type = "button";
  button.textContent = "复制代码";
  button.setAttribute("aria-live", "polite");
  hint.className = classes.scrollHint;
  hint.textContent = "代码可左右滑动";
  hint.setAttribute("aria-hidden", "true");
  toolbar.append(language, button);
  pre.before(wrapper);
  wrapper.append(toolbar, pre, hint);

  const originalAttributes = (["tabindex", "role", "aria-label"] as const).map(
    (name) => [name, pre.getAttribute(name)] as const,
  );
  pre.tabIndex = 0;
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", `${language.textContent} 代码，可横向滚动`);

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
  const stopObserving = observeOverflow(pre, hint, () => undefined);

  return () => {
    active = false;
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    button.removeEventListener("click", onCopy);
    stopObserving();
    for (const [name, value] of originalAttributes) restoreAttribute(pre, name, value);
    unwrap(pre, wrapper);
  };
}

function enhanceTable(table: HTMLTableElement, classes: BodyClassNames): Cleanup {
  const document = table.ownerDocument;
  const wrapper = document.createElement("div");
  const hint = document.createElement("span");
  wrapper.className = classes.tableScroll;
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "数据表格，可横向滚动");
  hint.className = classes.scrollHint;
  hint.textContent = "表格可左右滑动";
  hint.setAttribute("aria-hidden", "true");
  table.before(wrapper);
  wrapper.append(table, hint);
  const stopObserving = observeOverflow(wrapper, hint, () => undefined);
  return () => {
    stopObserving();
    unwrap(table, wrapper);
  };
}

function enhanceImage(image: HTMLImageElement, classes: BodyClassNames): Cleanup {
  const document = image.ownerDocument;
  const button = document.createElement("button");
  const error = document.createElement("span");
  button.className = classes.imageButton;
  button.type = "button";
  button.dataset.readerImage = "";
  button.setAttribute("aria-label", `查看图片${image.alt === "" ? "" : `：${image.alt}`}`);
  error.className = classes.imageError;
  error.setAttribute("role", "status");
  image.before(button);
  button.append(image, error);
  if (!image.hasAttribute("loading")) image.loading = "lazy";
  image.decoding = "async";

  const onError = (): void => {
    button.classList.add(classes.hasImageError);
    error.textContent = `图片暂时无法显示${image.alt === "" ? "。" : `：${image.alt}`}`;
  };
  image.addEventListener("error", onError);
  if (image.complete && image.naturalWidth === 0) onError();
  return () => {
    image.removeEventListener("error", onError);
    button.classList.remove(classes.hasImageError);
    unwrap(image, button);
  };
}

/** Progressively enhance trusted, server-sanitized record HTML; the original text stays server-rendered. */
export function enhanceRecordBody(root: HTMLElement, classes: BodyClassNames): Cleanup {
  const cleanups: Cleanup[] = [];
  for (const pre of Array.from(root.querySelectorAll<HTMLPreElement>("pre"))) {
    cleanups.push(enhanceCode(pre, classes));
  }
  for (const table of Array.from(root.querySelectorAll<HTMLTableElement>("table"))) {
    cleanups.push(enhanceTable(table, classes));
  }
  for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img"))) {
    cleanups.push(enhanceImage(image, classes));
  }
  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
