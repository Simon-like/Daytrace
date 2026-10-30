import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <aside className="archive-sidebar" aria-label="站点档案栏">
        <Link className="brand" href="/" aria-label="有迹 Daytrace 首页">
          <Image src="/brand/daytrace-icon-reverse.svg" alt="" width={42} height={42} priority />
          <span><strong>有迹</strong><small>DAYTRACE</small></span>
        </Link>
        <p className="brand-line">让经历有迹可循。</p>
        <nav aria-label="主要导航"><Link href="/">近期记录</Link></nav>
        <p className="sidebar-note">技术实践、生活经验与随想，留在同一份可迁移的档案里。</p>
      </aside>
      <header className="mobile-header">
        <Link className="brand" href="/" aria-label="有迹 Daytrace 首页">
          <Image src="/brand/daytrace-icon-reverse.svg" alt="" width={36} height={36} priority />
          <span><strong>有迹</strong><small>DAYTRACE</small></span>
        </Link>
      </header>
      <div className="page-column">{children}</div>
    </div>
  );
}
