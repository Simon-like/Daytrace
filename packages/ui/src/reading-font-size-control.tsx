"use client";

import { useEffect, useState } from "react";
import {
  READING_FONT_SIZE_KEY,
  READING_FONT_SIZE_OPTIONS,
  parseReadingFontSize,
  readReadingFontSize,
  type ReadingFontSize,
} from "./reading-preferences";

export function ReadingFontSizeControl() {
  const [current, setCurrent] = useState<ReadingFontSize>("standard");

  useEffect(() => {
    const apply = (value: ReadingFontSize) => {
      document.documentElement.dataset.readingFontSize = value;
      setCurrent(value);
    };
    apply(readReadingFontSize(window.localStorage));
    const onStorage = (event: StorageEvent) => {
      if (event.key === READING_FONT_SIZE_KEY) apply(parseReadingFontSize(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const select = (value: ReadingFontSize) => {
    document.documentElement.dataset.readingFontSize = value;
    setCurrent(value);
    try { window.localStorage.setItem(READING_FONT_SIZE_KEY, value); } catch { /* Keep the in-memory preference when storage is denied. */ }
  };

  return (
    <div className="dt-reading-preferences" role="group" aria-label="正文字号">
      <span className="dt-reading-preferences__label">字号</span>
      <div className="dt-reading-preferences__options">
        {READING_FONT_SIZE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className="dt-reading-preferences__option"
            aria-pressed={current === option.value}
            onClick={() => select(option.value)}
          >{option.label}</button>
        ))}
      </div>
    </div>
  );
}
