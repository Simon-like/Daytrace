import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { readingFontSizeBootScript } from "@daytrace/ui/reading-preferences";
import { SiteShell } from "../layouts/site-shell";
import "./globals.css";
import "../styles/redesign.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000"),
  title: { default: "有迹 Daytrace", template: "%s · 有迹 Daytrace" },
  description: "让经历有迹可循。技术实践、生活经验与随想认知的个人档案。",
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#243128",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: readingFontSizeBootScript }} /></head>
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
