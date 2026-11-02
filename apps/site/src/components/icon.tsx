import type { CSSProperties } from "react";
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  archive: "M4 4h16v4H4z M5 8v12h14V8 M9 12h6",
  search: "M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  about: "M12 8v.01 M12 12v5 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  code: "M8 7 3 12l5 5 M16 7l5 5-5 5 M14 4l-4 16",
  bowl: "M3 11h18c0 5-3 9-9 9s-9-4-9-9Z M7 4v3 M12 3v4 M17 4v3 M5 22h14",
  feather: "M4 21 15 10 M4 16 15 5c6-6 10 0 4 6L8 22 M9 16h6",
  lock: "M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 15v2",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M6 18 18 6",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
} as const;
export function Icon({ name, size = 20, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}
