"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "./icon";

const navigation = [
  { href: "/", label: "我的庭院", icon: "home" },
  { href: "/archive", label: "全部归档", icon: "archive" },
  { href: "/search", label: "找一找", icon: "search" },
  { href: "/about", label: "关于有迹", icon: "about" },
] as const;
function Brand() {
  return <Link prefetch={false} className="brand" href="/" aria-label="有迹 Daytrace 首页"><img src="/brand/daytrace-icon-reverse.svg" width="44" height="44" alt="" /><span><strong>有迹</strong><small>DAYTRACE</small></span></Link>;
}
export function Navigation() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef("");
  function close() { if (!dialog.current?.open) return; dialog.current.close(); closed(); }
  function opened() { previousOverflow.current = document.body.style.overflow; document.body.style.overflow = "hidden"; dialog.current?.showModal(); }
  function closed() { if (dialog.current?.open) return; document.body.style.overflow = previousOverflow.current; trigger.current?.focus(); }
  function links() { return navigation.map(item => <Link prefetch={false} key={item.href} href={item.href} onClick={close} aria-current={pathname === item.href ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span><span className="nav-mark">↗</span></Link>); }
  return <>
    <aside className="archive-sidebar" aria-label="站点档案栏">
      <Brand /><p className="brand-line">让经历有迹可循。</p>
      <nav className="primary-nav" aria-label="主要导航">{links()}</nav>
      <div className="sidebar-drawers"><p className="sidebar-label">三个抽屉</p>
        <Link prefetch={false} href="/archive?type=engineering"><Icon name="code" />技术实践<span>拆解 · 理解</span></Link>
        <Link prefetch={false} href="/archive?type=recipe"><Icon name="bowl" />生活经验<span>动手 · 记住</span></Link>
        <Link prefetch={false} href="/archive?type=reflection"><Icon name="feather" />随想认知<span>感受 · 回看</span></Link>
      </div>
      <div className="sidebar-bottom"><p className="sidebar-hand">不必完整，<br />慢慢长成<br />自己的样子。</p><Link prefetch={false} className="owner-link" href="/owner"><Icon name="lock" size={15} />只留给自己<span>↗</span></Link><p className="sidebar-foot">一份持续生长的个人档案<br /><span>EST. 2026 · 有迹</span></p></div>
    </aside>
    <header className="mobile-header"><Brand /><div className="mobile-actions"><Link prefetch={false} href="/search" aria-label="查找记录"><Icon name="search" /></Link><button ref={trigger} type="button" aria-label="打开导航" onClick={opened}><Icon name="menu" /></button></div></header>
    <dialog className="mobile-menu" ref={dialog} onClose={closed} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="mobile-menu-title"><div className="mobile-menu-inner"><div className="menu-top"><p id="mobile-menu-title">翻一翻有迹</p><button type="button" aria-label="关闭导航" onClick={close}><Icon name="close" /></button></div><nav aria-label="手机导航">{links()}<Link prefetch={false} href="/owner" onClick={close}><Icon name="lock" />只留给自己</Link></nav><p className="sidebar-hand">留一点时间，<br />回到自己这里。</p></div></dialog>
  </>;
}
