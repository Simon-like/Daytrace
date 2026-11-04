export const READING_FONT_SIZE_KEY = "daytrace.readingFontSize.v1";

export const READING_FONT_SIZE_OPTIONS = [
  { value: "standard", label: "标准" },
  { value: "large", label: "较大" },
  { value: "xlarge", label: "特大" },
] as const;

export type ReadingFontSize = (typeof READING_FONT_SIZE_OPTIONS)[number]["value"];

export interface ReadingFontSizeStorage {
  readonly getItem: (key: string) => string | null;
}

export function parseReadingFontSize(value: string | null): ReadingFontSize {
  return value === "large" || value === "xlarge" ? value : "standard";
}

export function readReadingFontSize(storage: ReadingFontSizeStorage | null): ReadingFontSize {
  try {
    return parseReadingFontSize(storage?.getItem(READING_FONT_SIZE_KEY) ?? null);
  } catch {
    return "standard";
  }
}

export function readBrowserReadingFontSize(getStorage: () => ReadingFontSizeStorage | null): ReadingFontSize {
  try {
    return readReadingFontSize(getStorage());
  } catch {
    return "standard";
  }
}

/** Restore only a fixed allowlist before React hydrates; storage may be unavailable. */
export const readingFontSizeBootScript = `(()=>{let v="standard";try{const s=localStorage.getItem(${JSON.stringify(READING_FONT_SIZE_KEY)});if(s==="large"||s==="xlarge"||s==="standard")v=s;}catch{}document.documentElement.dataset.readingFontSize=v;})();`;
