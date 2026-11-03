"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@daytrace/ui/brand-mark";
import { Icon } from "@daytrace/ui/icon";

const items = [
  { href: "/", label: "庭院", icon: "home" },
  { href: "/archive", label: "归档", icon: "archive" },
  { href: "/search", label: "找一找", icon: "search" },
  { href: "/about", label: "关于", icon: "about" },
  { href: "/owner", label: "我的", icon: "lock" },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reading = pathname.startsWith("/records/");
  return <>
    <a className="h5-skip" href="#h5-content">跳到正文</a>
    <header className="h5-header">
      <Link className="h5-brand" href="/" aria-label="有迹 H5 首页"><BrandMark assetPrefix="/h5" compact /></Link>
      <span className="h5-edition">随身档案</span>
    </header>
    <div id="h5-content" className="h5-content">{children}</div>
    <nav className="h5-tabs" aria-label="移动主导航">
      {items.map(item => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || (item.href === "/archive" && reading);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}><Icon name={item.icon} size={21} /><span>{item.label}</span></Link>;
      })}
    </nav>
  </>;
}
