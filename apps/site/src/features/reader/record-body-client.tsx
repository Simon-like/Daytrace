"use client";

import { useEffect, useState } from "react";
import { ImageLightbox, type ReaderImage } from "./image-lightbox";
import { enhanceRecordBody, type BodyClassNames } from "./record-body-enhancements";
import styles from "./reader.module.css";

interface RecordBodyClientProps {
  readonly targetId: string;
}

export function RecordBodyClient({ targetId }: RecordBodyClientProps) {
  const [image, setImage] = useState<ReaderImage | null>(null);

  useEffect(() => {
    const body = document.getElementById(targetId);
    if (body === null) return;
    const cleanupEnhancements = enhanceRecordBody(body, styles as unknown as BodyClassNames);
    const onClick = (event: Event): void => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>("button[data-reader-image]");
      const source = button?.querySelector("img");
      if (button == null || source == null || !body.contains(button)) return;
      const caption = button.closest("figure")?.querySelector("figcaption")?.textContent ?? null;
      setImage({
        src: source.currentSrc || source.src,
        alt: source.alt,
        caption,
      });
    };
    body.addEventListener("click", onClick);
    return () => {
      body.removeEventListener("click", onClick);
      cleanupEnhancements();
    };
  }, [targetId]);

  return image === null ? null : <ImageLightbox image={image} onClose={() => setImage(null)} />;
}
