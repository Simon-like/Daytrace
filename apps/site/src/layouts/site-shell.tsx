import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "../components/navigation";
export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="site-frame"><a className="skip-link" href="#main-content">跳到正文</a><Navigation /><div className="page-column" id="main-content">{children}<footer className="site-footer"><span>有迹 · 让经历有迹可循。</span><Link href="/about">关于这份档案 ↗</Link><span className="demo-stamp">演示内容，慢慢生长</span></footer></div></div>;
}
