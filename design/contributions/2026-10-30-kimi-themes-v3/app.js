const themes = {
  margin: { name: '页边有时', en: 'MARGIN & TIME', note: '把认知变化写在页边，适合长期阅读与回看。' },
  grid: { name: '格物手账', en: 'FIELD NOTES', note: '用方格和档案编号组织实践，理性但仍然有温度。' },
  folio: { name: '季候小刊', en: 'SEASONAL FOLIO', note: '像一本持续出版的生活小刊，强调节奏与公开表达。' },
};

const techArt = () => `
<svg class="art tech-art" viewBox="0 0 520 280" role="img" aria-label="主子应用关系示意图">
  <g fill="none" stroke="currentColor" stroke-width="1.4">
    <rect x="28" y="38" width="148" height="64" />
    <rect x="344" y="22" width="142" height="54" />
    <rect x="344" y="113" width="142" height="54" />
    <rect x="344" y="204" width="142" height="54" />
    <path d="M176 70h68c36 0 34-21 66-21h34M176 70h68c36 0 34 70 66 70h34M176 70h68c36 0 34 161 66 161h34" />
    <path d="M49 146h185M49 166h142M49 186h164" opacity=".45" />
    <circle cx="244" cy="70" r="4" class="art-accent-fill" stroke="none" />
  </g>
  <g class="art-labels">
    <text x="48" y="76">MAIN APP</text><text x="365" y="55">ENTRY</text>
    <text x="365" y="146">ROUTE</text><text x="365" y="237">RUNTIME</text>
    <text x="49" y="228">从入口开始，找到加载边界</text>
  </g>
</svg>`;

const foodArt = () => `
<svg class="art food-art" viewBox="0 0 420 330" role="img" aria-label="麻婆豆腐线描图">
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <ellipse cx="210" cy="172" rx="158" ry="126" />
    <ellipse cx="210" cy="172" rx="139" ry="108" />
    <path d="M79 135c46-60 211-89 272 15M86 222c61 69 208 74 260-5" opacity=".35" />
    <path d="M329 54l48-34M337 65l51-32" stroke-width="5" />
  </g>
  <g class="food-cubes">
    <path d="M135 120l43-14 30 26-5 42-45 11-30-28z" />
    <path d="M218 104l42 5 13 39-31 29-42-12-6-35z" />
    <path d="M119 190l42-9 28 29-12 38-43 2-24-29z" />
    <path d="M205 187l44-12 32 25-4 42-46 13-32-28z" />
    <path d="M272 151l30 4 11 28-23 22-29-10-5-25z" />
  </g>
  <g class="art-accent-fill">
    <circle cx="173" cy="143" r="4"/><circle cx="233" cy="207" r="4"/><circle cx="273" cy="129" r="4"/>
    <circle cx="149" cy="220" r="3"/><circle cx="231" cy="135" r="3"/><circle cx="290" cy="177" r="3"/>
  </g>
  <text class="art-labels" x="30" y="310">第二次，终于对了 · 示例记录</text>
</svg>`;

const nav = (prefix = '') => `
<header class="${prefix}site-header">
  <a class="wordmark" href="?page=home" aria-label="日常有迹首页">日常有迹</a>
  <nav aria-label="主导航"><a href="#records">技术</a><a href="#records">生活</a><a href="#records">随想</a><a href="#records">索引</a></nav>
  <span class="header-season">二〇二六 · 秋</span>
</header>`;

const dock = (theme, page) => `
<aside class="preview-dock" aria-label="主题预览控制">
  <div class="dock-themes">${Object.entries(themes).map(([key, item]) => `<button data-theme-key="${key}" class="${key === theme ? 'active' : ''}" aria-pressed="${key === theme}">${item.name}</button>`).join('')}</div>
  <div class="dock-pages"><button data-page-key="home" class="${page === 'home' ? 'active' : ''}">首页</button><button data-page-key="article" class="${page === 'article' ? 'active' : ''}">文章页</button></div>
  <span>示例内容 · 尚未选定</span>
</aside>`;

function marginHome() {
  return `<main class="margin-home">
    ${nav('margin-')}
    <div class="margin-layout">
      <aside class="date-rail" aria-label="月份索引"><span>2026</span><a class="selected" href="#records">十月</a><a href="#records">九月</a><a href="#records">八月</a><a href="#records">更早</a><small>TIME / INDEX</small></aside>
      <div class="margin-main">
        <section class="margin-intro">
          <div><p class="eyebrow">A LIVING ARCHIVE · 持续生长的档案</p><h1>把做过的事，<br>写成能回来的路。</h1><p class="intro-copy">记录一次排查、一道菜，也记录当时的自己。<br>不急着总结，让理解慢慢长出来。</p></div>
          <blockquote>“有些答案，<br>要过些日子才看得见。”<cite>写给自己的页边注</cite></blockquote>
        </section>
        <section class="margin-records" id="records">
          <article class="margin-feature">
            <div class="record-meta"><span>NO. 026</span><time>2026.10.26</time><span>技术实践</span></div>
            <h2>微前端，<br>不只是一份配置</h2>
            <p>从主应用入口、注册和路由往下走，重新找到应用之间真正的加载边界。</p>
            <a class="text-link" href="?theme=margin&page=article">读这篇记录 <span>↗</span></a>
            ${techArt()}
          </article>
          <article class="margin-life">
            <div class="record-meta"><span>NO. 025</span><time>10.25</time></div>
            ${foodArt()}
            <h3>麻婆豆腐：第二次，终于对了</h3>
            <p>这次记住的不是食谱，而是豆腐下锅以后，少一点翻动。</p>
          </article>
        </section>
        <section class="margin-reflection"><span class="record-meta">NO. 018 · 随想</span><p>允许自己暂时没有答案。</p><a href="?theme=margin&page=article">回到当时 ↗</a></section>
      </div>
      <aside class="margin-notes" aria-label="后来的补充">
        <div class="note-heading">MARGIN NOTES <span>页边</span></div>
        <section><time>10.26 · 当时</time><p>以为只要把主子应用的配置对齐，问题就能解决。</p></section>
        <div class="note-connector" aria-hidden="true"></div>
        <section class="later"><time>11.03 · 后来</time><p>真正帮我定位问题的，是先弄清入口、注册和路由之间的关系。</p><a href="?theme=margin&page=article">查看变化 ↗</a></section>
        <div class="margin-reminder"><span>给自己的提醒</span><p>先把眼前的事做好，<br>不必急着证明自己。</p></div>
      </aside>
    </div>
    <footer class="margin-footer"><span>日常有迹 · 示例主题</span><span>写作于日常，回看于时间</span></footer>
  </main>`;
}

function gridHome() {
  return `<main class="grid-home">
    <div class="binder" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    ${nav('grid-')}
    <div class="grid-index"><span>PERSONAL FIELD NOTES</span><span>OBSERVE / TEST / REVISE</span><span>VOL. 2026—10</span></div>
    <section class="grid-intro">
      <div class="grid-number">026<span>条正在生长的记录</span></div>
      <h1>把经验留下，<br>把修改也留下。</h1>
      <p>一座关于工程、厨房与日常判断的观察场。<br>每条记录都允许补充，不假装一次就想明白。</p>
      <span class="grid-stamp">OPEN<br>ARCHIVE</span>
    </section>
    <section class="grid-ledger" id="records">
      <article class="grid-tech">
        <header><span>FIELD / ENGINEERING</span><time>2026.10.26</time></header>
        <div class="grid-tech-body"><div><span class="grid-no">NO. 026</span><h2>微前端，<br>不只是一份配置</h2><p>一次从入口到路由的排查留痕。配置只是表面，边界才是这次真正弄懂的事。</p><a href="?theme=grid&page=article">打开田野记录 ↗</a></div>${techArt()}</div>
        <footer><span>关键词：主子应用 / 注册 / 路由</span><span>状态：仍有补充</span></footer>
      </article>
      <article class="grid-food">
        <header><span>FIELD / KITCHEN</span><time>10.25</time></header>
        ${foodArt()}
        <h3>麻婆豆腐：<br>第二次，终于对了</h3>
        <p> OBSERVATION 02<br>少翻一次，豆腐多完整一分。</p>
      </article>
      <article class="grid-note">
        <span class="grid-no">NOTE / 018</span>
        <blockquote>允许自己<br>暂时没有答案。</blockquote>
        <div class="grid-revision"><span>当时 10.18</span><p>想尽快证明自己没有停下。</p><span>后来 11.03</span><p>能把问题说清楚，也是在向前走。</p></div>
      </article>
    </section>
    <footer class="grid-footer"><span>日常有迹 / 个人观察档案</span><span>下一页：按时间查看全部记录 →</span></footer>
  </main>`;
}

function folioHome() {
  return `<main class="folio-home">
    <div class="folio-topline"><span>INDEPENDENT NOTES ON WORK & LIFE</span><span>ISSUE 010 · AUTUMN 2026</span></div>
    ${nav('folio-')}
    <section class="folio-masthead"><h1>日常有迹</h1><div><span>技术 · 生活 · 随想</span><p>一本持续修订的个人小刊。<br>出版日子，也出版后来的理解。</p></div></section>
    <section class="folio-lead" id="records">
      <div class="folio-lead-art"><span class="folio-section-no">01 / 技术实践</span>${techArt()}<div class="folio-caption"><span>FIG. 01</span><p>从入口、注册到路由：<br>一张排查路径的速写。</p></div></div>
      <article class="folio-lead-copy"><div class="record-meta"><time>2026.10.26</time><span>阅读约 8 分钟</span></div><h2>微前端，<br>不只是一份配置</h2><p>问题表面上是一份没有对齐的配置，往下追，却是一次重新理解应用边界的过程。</p><a class="text-link" href="?theme=folio&page=article">阅读本期封面记录 <span>↗</span></a></article>
    </section>
    <section class="folio-second">
      <article class="folio-food"><div class="folio-food-copy"><span class="folio-section-no">02 / 生活实践</span><h3>麻婆豆腐：<br>第二次，终于对了</h3><p>食谱之外，留下这次真正做过的步骤，以及下一次想调整的地方。</p><time>2026.10.25</time></div>${foodArt()}</article>
      <aside class="folio-aside"><span>EDITOR'S NOTE</span><p>“记录不是把日子变成成果，<br>而是给未来的自己留一条回去的路。”</p><small>本期例言 · 示例文案</small></aside>
    </section>
    <section class="folio-quote"><div><span>03 / 随想与认知</span><time>ORIGINAL · 10.18</time></div><blockquote>允许自己<br>暂时没有答案。</blockquote><aside><span>REVISED · 11.03</span><p>后来才懂，停下来把问题看清，<br>不等于停在原地。</p></aside></section>
    <footer class="folio-footer"><span>日常有迹 · 二〇二六秋</span><a href="#records">翻阅全部记录 ↗</a></footer>
  </main>`;
}

function article(theme) {
  return `<main class="article-page ${theme}-article">
    ${nav(`${theme}-`)}
    <div class="article-shell">
      <aside class="article-rail"><a href="?theme=${theme}&page=home">← 返回记录</a><span>TECHNICAL NOTE</span><span>2026 / 10 / 26</span><span>约 8 分钟</span></aside>
      <article class="article-content">
        <a class="article-back" href="?theme=${theme}&page=home">← 返回记录</a>
        <header class="article-header"><div class="record-meta"><span>技术实践</span><time>2026.10.26</time><span>NO. 026</span></div><h1>微前端，<br>不只是一份配置</h1><p class="article-deck">从主应用入口、注册和路由往下走，重新找到应用之间真正的加载边界。</p></header>
        <details class="article-toc"><summary>本文目录 <span>3 个小节</span></summary><ol><li><a href="#boundary">从入口开始，找到边界</a></li><li><a href="#config">配置项到底负责什么</a></li><li><a href="#later">后来补充：先画关系，再改配置</a></li></ol></details>
        <section class="article-section" id="boundary"><span class="section-index">01 / BOUNDARY</span><h2>从入口开始，找到边界</h2><p>这次记录不从概念开始，而从一次具体的排查开始。沿着主应用入口、微应用注册和路由匹配往下走，逐步确认每个环节由谁负责。</p><p>当页面没有按预期加载时，配置项只是线索。更重要的是先看请求到了哪里、对应应用是否注册，以及当前路由有没有命中。</p>${techArt()}</section>
        <section class="article-section" id="config"><span class="section-index">02 / CONFIG</span><h2>配置项到底负责什么</h2><p>下面的代码是设计示例，用来展示阅读排版，不代表一次真实项目配置。</p><div class="code-block"><div class="code-head"><span>JavaScript</span><button class="copy-code" type="button">复制代码</button></div><pre><code>registerMicroApps([{
  name: 'operation',
  entry: '//localhost:7101',
  container: '#subapp-viewport',
  activeRule: '/operation',
}]);</code></pre></div><div class="table-scroll" tabindex="0" aria-label="配置说明表，可横向滚动"><table><thead><tr><th>配置项</th><th>它负责什么</th><th>这次先看哪里</th></tr></thead><tbody><tr><td><code>name</code></td><td>微应用的唯一标识</td><td>注册名与挂载名是否一致</td></tr><tr><td><code>activeRule</code></td><td>什么路由下激活应用</td><td>当前地址是否真正命中</td></tr></tbody></table></div></section>
        <aside class="later-addition" id="later"><div><span>后来补充</span><time>2026.11.03</time></div><p>后来再看，当时只盯着配置，是因为还没把应用之间的关系画出来。先确认入口、注册和路由，再改配置，排查会更有顺序。</p><a href="#boundary">回到对应段落 ↑</a></aside>
        <footer class="article-end"><span>记录于 2026.10.26</span><span>最近补充 2026.11.03</span></footer>
      </article>
      <aside class="article-margin"><span>页边注</span><p>先把关系说清楚，<br>再开始改配置。</p><div></div><small>这是一条示例认识，<br>不是用户真实项目记录。</small></aside>
    </div>
  </main>`;
}

function render() {
  const params = new URLSearchParams(location.search);
  const theme = themes[params.get('theme')] ? params.get('theme') : 'margin';
  const page = params.get('page') === 'article' ? 'article' : 'home';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.page = page;
  document.documentElement.dataset.clean = params.get('clean') === '1' ? 'true' : 'false';
  document.title = `${themes[theme].name} · 日常有迹`;
  const home = theme === 'margin' ? marginHome() : theme === 'grid' ? gridHome() : folioHome();
  document.querySelector('#app').innerHTML = `${page === 'home' ? home : article(theme)}${dock(theme, page)}`;
  document.querySelectorAll('[data-theme-key]').forEach(button => button.addEventListener('click', () => {
    const next = new URLSearchParams(location.search);
    next.set('theme', button.dataset.themeKey);
    next.set('page', 'home');
    location.search = next.toString();
  }));
  document.querySelectorAll('[data-page-key]').forEach(button => button.addEventListener('click', () => {
    const next = new URLSearchParams(location.search);
    next.set('theme', theme);
    next.set('page', button.dataset.pageKey);
    location.search = next.toString();
  }));
  document.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', async () => {
    const code = button.closest('.code-block').querySelector('code').textContent;
    try { await navigator.clipboard.writeText(code); button.textContent = '已复制'; }
    catch { button.textContent = '请手动复制'; }
    setTimeout(() => { button.textContent = '复制代码'; }, 1600);
  }));
}

render();
