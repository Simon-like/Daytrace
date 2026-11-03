import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MobileShell } from "../components/mobile-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000"),
  title: { default: "有迹 Daytrace", template: "%s · 有迹 Daytrace" },
  description: "让经历有迹可循。为有迹的移动阅读与检索而设计。",
  alternates: { types: { "application/rss+xml": new URL("/rss.xml", process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000").href } },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#243128",
};

export default function H5Layout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body><MobileShell>{children}</MobileShell></body></html>;
}
