"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@daytrace/ui/icon";

interface ReaderImage { readonly src: string; readonly alt: string; readonly caption: string | null }

function ImageDialog({ image, onClose }: { readonly image: ReaderImage; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} className="h5-lightbox" aria-label="查看正文图片" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><button type="button" aria-label="关闭图片" onClick={onClose}><Icon name="close" /></button><img src={image.src} alt={image.alt} />{image.caption ? <p>{image.caption}</p> : null}</dialog>;
}

export function ReaderEnhancements({ targetId }: { readonly targetId: string }) {
  const [image, setImage] = useState<ReaderImage | null>(null);
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const updateOverflow = (node: HTMLElement) => { node.dataset.overflow = String(node.scrollWidth > node.clientWidth + 1); };
    const overflowNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reader-code-scroll], [data-reader-table]"));
    const onResize = () => overflowNodes.forEach(updateOverflow);
    window.addEventListener("resize", onResize);
    onResize();
    cleanups.push(() => window.removeEventListener("resize", onResize));

    for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-code-copy]"))) {
      const onCopy = async () => {
        const code = button.closest("[data-reader-code]")?.querySelector("code")?.textContent ?? "";
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "已复制";
          button.dataset.copyState = "copied";
        } catch {
          button.textContent = "复制失败，请手动复制";
          button.dataset.copyState = "failed";
          const codeNode = button.closest("[data-reader-code]")?.querySelector("code");
          if (codeNode) { const range = document.createRange(); range.selectNodeContents(codeNode); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
        }
        window.setTimeout(() => { button.textContent = "复制代码"; delete button.dataset.copyState; }, 2400);
      };
      button.addEventListener("click", onCopy);
      cleanups.push(() => button.removeEventListener("click", onCopy));
    }
    for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-reader-image]"))) {
      const source = button.querySelector("img");
      if (!source) continue;
      const onError = () => { const error = button.querySelector<HTMLElement>("[data-image-error]"); button.classList.add("has-image-error"); if (error) error.textContent = `图片暂时无法显示${source.alt ? `：${source.alt}` : "。"}`; };
      source.addEventListener("error", onError);
      if (source.complete && source.naturalWidth === 0) onError();
      cleanups.push(() => source.removeEventListener("error", onError));
    }
    const onClick = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>("button[data-reader-image]");
      const source = button?.querySelector("img");
      if (!button || !source || !root.contains(button)) return;
      setImage({ src: source.currentSrc || source.src, alt: source.alt, caption: button.closest("figure")?.querySelector("figcaption")?.textContent ?? null });
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));
    return () => cleanups.forEach(cleanup => cleanup());
  }, [targetId]);
  return image ? <ImageDialog image={image} onClose={() => setImage(null)} /> : null;
}
