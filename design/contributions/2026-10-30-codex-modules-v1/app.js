import {records,hrefFor,escapeHtml as e,filterRecords} from './data.js';
import {renderPage,noteLine} from './pages.js';

const params=new URLSearchParams(location.search);
const page=params.get('page')||'home';
const view=renderPage(page,params);
const icons={
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m16 16 5 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.3"/></svg>',
  close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" stroke="currentColor" stroke-width="1.3"/></svg>'
};
const navItems=[['home','?page=home','记录首页'],['archive','?page=archive','全部记录'],['tech','?page=archive&category=技术实践','技术实践'],['recipe','?page=archive&category=生活经验','厨房与生活'],['thought','?page=archive&category=随想认知','随想认知'],['about','?page=about','关于这里']];
const current=params.get('category')==='技术实践'?'tech':params.get('category')==='生活经验'?'recipe':params.get('category')==='随想认知'?'thought':view.active;
const nav=navItems.map(([id,url,label])=>`<a href="${url}"${current===id?' aria-current="page"':''}>${label}</a>`).join('');

document.title=`${view.title}${page==='home'?'':' · 日常有迹'}`;
document.querySelector('#app').innerHTML=`<div class="shell">
  <aside class="sidebar"><a class="brand" href="?page=home" aria-label="日常有迹，返回首页">日常<br>有迹<span class="brand-en">PERSONAL<br>FIELD JOURNAL</span></a><nav aria-label="主导航">${nav}</nav><div class="rail-dates"><p class="eyebrow" style="color:#bdc7b4;margin-bottom:8px">2026 / 秋</p>${records.slice(0,5).map(r=>`<a href="${hrefFor(r)}">${r.date.slice(5).replace('-','.')} <span class="sr-only">${e(r.title)}</span></a>`).join('')}</div><p class="rail-caption">把平凡的日子<br>记下来，<br>也是积累。</p></aside>
  <div class="main-wrap"><header class="mobile-header"><a class="mobile-brand" href="?page=home">日常有迹</a><div class="mobile-actions"><button class="icon-button" type="button" data-open-search aria-label="搜索记录">${icons.search}</button><button class="icon-button" type="button" data-open-menu aria-label="打开导航菜单">${icons.menu}</button></div></header><div class="container"><header class="desktop-top"><p class="eyebrow">PRIVATE FIELD JOURNAL <span aria-hidden="true"> / </span> 自己的观察与实践</p><button type="button" class="search-trigger" data-open-search>${icons.search}<span>搜索记录</span><kbd>⌘ K</kbd></button></header><main id="main-content" class="page-body" tabindex="-1">${view.html}</main><footer class="footer"><span>日常有迹 &nbsp; / &nbsp; 技术 · 生活 · 随想</span><span class="sample-note">内容与照片为设计示例</span><a href="?page=about">关于这个地方 ↗</a></footer></div></div></div>
  <dialog id="search-dialog" aria-labelledby="search-title"><div class="dialog-inner"><div class="dialog-top"><h2 id="search-title">找一份留下的记录</h2><button type="button" class="icon-button" data-close-dialog aria-label="关闭搜索">${icons.close}</button></div><label class="sr-only" for="global-search">输入标题、关键词或标签</label><input id="global-search" class="search-input" type="search" autocomplete="off" maxlength="128" placeholder="比如：微前端、豆腐、允许自己"><p id="search-count" class="search-hint" role="status">可以按标题、关键词或标签查找</p><ul id="search-results" class="search-results"></ul></div></dialog>
  <dialog id="menu-dialog" aria-labelledby="menu-title"><div class="dialog-inner"><div class="dialog-top"><h2 id="menu-title">慢慢翻阅</h2><button type="button" class="icon-button" data-close-dialog aria-label="关闭导航">${icons.close}</button></div><nav class="menu-links" aria-label="移动端导航">${navItems.map(([,url,label])=>`<a href="${url}">${label}<span aria-hidden="true">↗</span></a>`).join('')}</nav><p class="menu-foot">先记下来，慢慢想明白。</p>${noteLine}</div></dialog>
  <dialog id="image-dialog" class="image-dialog" aria-labelledby="image-title"><div class="dialog-top"><h2 id="image-title">这一刻的细节</h2><button type="button" class="icon-button" data-close-dialog aria-label="关闭图片">${icons.close}</button></div><img id="expanded-image" src="" alt=""><p id="expanded-caption"></p></dialog>
  <div id="toast" class="toast" role="status" hidden></div>`;

const searchDialog=document.querySelector('#search-dialog');
const menuDialog=document.querySelector('#menu-dialog');
const imageDialog=document.querySelector('#image-dialog');
let toastTimer;
function showToast(message) {
  const el=document.querySelector('#toast');
  clearTimeout(toastTimer);
  el.textContent=message;
  el.hidden=false;
  toastTimer=setTimeout(()=>{el.hidden=true;},2400);
}
function openDialog(dialog) {
  dialog.returnFocus=document.activeElement;
  dialog.showModal();
  document.body.style.overflow='hidden';
  requestAnimationFrame(()=>dialog.querySelector('input,button,a')?.focus());
}
function restoreAfterDialog(dialog) {
  if(document.querySelector('dialog[open]')) return;
  document.body.style.overflow='';
  if(dialog.returnFocus?.isConnected) dialog.returnFocus.focus({preventScroll:true});
}
function closeDialog(dialog) {
  dialog.close();
  restoreAfterDialog(dialog);
}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('close',()=>restoreAfterDialog(dialog));
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
  dialog.addEventListener('click',ev=>{
    if(ev.target!==dialog) return;
    const b=dialog.getBoundingClientRect();
    if(ev.clientX<b.left||ev.clientX>b.right||ev.clientY<b.top||ev.clientY>b.bottom) closeDialog(dialog);
  });
});
function updateSearch() {
  const q=document.querySelector('#global-search').value;
  const result=filterRecords(q);
  document.querySelector('#search-count').textContent=q.trim()?`找到 ${result.length} 条相关记录`:'从最近的记录开始';
  document.querySelector('#search-results').innerHTML=result.length?result.map(r=>`<li><a href="${hrefFor(r)}"><p class="eyebrow">${r.date.replaceAll('-','.')} / ${r.category}</p><h3>${e(r.title)}</h3><p>${e(r.excerpt)}</p></a></li>`).join(''):'<li class="empty-state"><h3>还没有找到这份记录。</h3><p>换一个词，或者清空搜索再看看。</p><button type="button" class="button" id="clear-global-search">清空搜索</button></li>';
  document.querySelector('#clear-global-search')?.addEventListener('click',()=>{document.querySelector('#global-search').value='';updateSearch();document.querySelector('#global-search').focus();});
}
document.querySelectorAll('[data-open-search]').forEach(button=>button.addEventListener('click',()=>{updateSearch();openDialog(searchDialog);document.querySelector('#global-search').focus();}));
document.querySelectorAll('[data-open-menu]').forEach(button=>button.addEventListener('click',()=>openDialog(menuDialog)));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('dialog'))));
document.querySelector('#global-search').addEventListener('input',updateSearch);
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Escape') return;
  const open=document.querySelector('dialog[open]');
  if(!open) return;
  ev.preventDefault();
  ev.stopPropagation();
  closeDialog(open);
},{capture:true});
document.addEventListener('keydown',ev=>{
  if((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='k') {
    ev.preventDefault();
    if(document.querySelector('dialog[open]')) return;
    updateSearch();openDialog(searchDialog);document.querySelector('#global-search').focus();
  }
});
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const text=button.closest('.code-block').querySelector('code').textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent='已复制';
    showToast('代码已复制');
    setTimeout(()=>{if(button.isConnected)button.textContent='复制代码';},1500);
  } catch {
    button.textContent='复制未成功';
    showToast('复制未成功，可以在代码区手动选择复制');
    setTimeout(()=>{if(button.isConnected)button.textContent='复制代码';},2200);
  }
}));
document.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{
  const image=document.querySelector('#expanded-image');
  image.src=button.dataset.image;
  image.alt=button.querySelector('img')?.alt||'图片细节';
  document.querySelector('#expanded-caption').textContent=button.dataset.caption;
  openDialog(imageDialog);
}));
document.querySelectorAll('.mobile-toc a').forEach(a=>a.addEventListener('click',()=>{a.closest('details').open=false;}));
const tocLinks=[...document.querySelectorAll('.toc-aside a')];
if(tocLinks.length&&'IntersectionObserver' in window) {
  const observer=new IntersectionObserver(entries=>{
    const current=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
    if(!current) return;
    tocLinks.forEach(a=>a.classList.toggle('active',a.hash===`#${current.target.id}`));
  },{rootMargin:'-90px 0px -60% 0px'});
  document.querySelectorAll('.prose h2[id],.article-amendment[id]').forEach(h=>observer.observe(h));
}
if(location.hash) requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
