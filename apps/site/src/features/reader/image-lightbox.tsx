"use client";

import { useEffect, useId, useRef, useState } from "react";
import { captureViewport, restoreFocusAndScroll } from "./reader-interactions";
import styles from "./reader.module.css";

export interface ReaderImage {
  readonly src: string;
  readonly alt: string;
  readonly caption: string | null;
}

interface ImageLightboxProps {
  readonly image: ReaderImage;
  readonly onClose: () => void;
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captionId = useId();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const document = dialog.ownerDocument;
    const window = document.defaultView;
    if (window === null) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const viewport = captureViewport(window);
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflow;
      restoreFocusAndScroll(returnFocus, viewport, window);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-labelledby={captionId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className={styles.lightboxPanel}>
        <div className={styles.lightboxBar}>
          <p id={captionId}>{image.caption ?? (image.alt || "正文图片")}</p>
          <button type="button" className={styles.lightboxClose} onClick={() => dialogRef.current?.close()}>
            关闭图片
          </button>
        </div>
        <div className={styles.lightboxMedia}>
          {failed ? (
            <p className={styles.lightboxError} role="alert">图片暂时无法显示，请关闭后稍后重试。</p>
          ) : (
            <img src={image.src} alt={image.alt} onError={() => setFailed(true)} draggable={false} />
          )}
        </div>
        <p className={styles.lightboxHint}>按 Esc 关闭并回到刚才的阅读位置</p>
      </div>
    </dialog>
  );
}
