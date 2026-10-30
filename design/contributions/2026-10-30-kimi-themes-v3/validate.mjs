import { chromium } from 'playwright';

const base = 'http://127.0.0.1:7100';
const results = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['margin', 'grid', 'folio']) {
    for (const pageName of ['home', 'article']) {
      for (const width of [360, 390, 768, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: width >= 1000 ? 1000 : 844 },
          locale: 'zh-CN',
          permissions: ['clipboard-read', 'clipboard-write'],
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?theme=${theme}&page=${pageName}&clean=1`, { waitUntil: 'networkidle' });
        await page.locator('main').waitFor();
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        assert(dimensions.document <= dimensions.viewport, `${theme}/${pageName}/${width}: document overflow ${JSON.stringify(dimensions)}`);
        assert(dimensions.body <= dimensions.viewport, `${theme}/${pageName}/${width}: body overflow ${JSON.stringify(dimensions)}`);
        assert(errors.length === 0, `${theme}/${pageName}/${width}: ${errors.join('; ')}`);

        if (pageName === 'article') {
          await page.locator('.article-toc summary').click();
          assert(await page.locator('.article-toc').evaluate(node => node.open), `${theme}/${width}: TOC did not open`);
          await page.locator('.copy-code').click();
          await page.waitForFunction(() => document.querySelector('.copy-code')?.textContent === '已复制');
          const table = await page.locator('.table-scroll').evaluate(node => ({
            client: node.clientWidth,
            scroll: node.scrollWidth,
            overflow: getComputedStyle(node).overflowX,
          }));
          if (width <= 390) assert(table.scroll > table.client, `${theme}/${width}: table should scroll internally on narrow screens`);
          assert(['auto', 'scroll'].includes(table.overflow), `${theme}/${width}: table overflow is ${table.overflow}`);
        }
        results.push(`${theme}/${pageName}/${width}px: pass`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log(results.join('\n'));
console.log(`\n${results.length} checks passed.`);
