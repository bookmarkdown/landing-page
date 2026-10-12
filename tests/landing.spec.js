import { test, expect } from '@playwright/test';
import { messages } from '../src/i18n.js';

test.use({ locale: 'zh-TW' });

const viewports = [
  { name: 'mobile-compact', width: 360, height: 800 },
  { name: 'mobile-standard', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
  { name: 'foldable-small-tablet', width: 600, height: 960 },
  { name: 'tablet-portrait', width: 820, height: 1180 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 }
];

for (const locale of ['en', 'zh-Hant', 'zh-Hans']) {
for (const viewport of viewports) {
  test(`${viewport.name} ${locale}: responsive layout and rendered controls`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator('[data-tags-for="mdn"] button')).toHaveCount(2);
    await expect(page.locator('h1')).toContainText('BMD・bookmarkdown');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#language-select')).toBeVisible();
    await expect(page.locator('#language-select')).toHaveValue(locale);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const overflow = await page.locator('button, h1, h2, h3, .footer-brand, .hero-eyebrow, .language-picker').evaluateAll(elements =>
      elements.filter(element => element.getClientRects().length && element.scrollWidth > element.clientWidth + 1).map(element => element.textContent)
    );
    expect(overflow).toEqual([]);
    const preview = await page.locator('#preview').boundingBox();
    expect(preview.y).toBeLessThan(viewport.height);
    await expect(page.locator('.logo svg')).toHaveCount(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-${locale}.png`), fullPage: true });
  });
}
}

test('search, filters and empty state can be combined and cleared', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '參考', exact: true }).click();
  await expect(page.locator('.bookmark-row:visible')).toHaveCount(2);
  await expect(page.locator('#library-title')).toHaveText('參考標籤');
  await expect(page.getByRole('button', { name: '參考', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const search = page.getByRole('searchbox');
  await search.fill('github');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#bookmark-count')).toHaveText('0 個示例');
  await page.getByRole('button', { name: '所有書籤', exact: true }).click();
  await expect(page.locator('.bookmark-row:visible')).toHaveCount(1);
  await search.fill('  MDN  ');
  await expect(page.locator('[data-bookmark="mdn"]')).toBeVisible();
  await search.fill('');
  await expect(page.locator('.bookmark-row:visible')).toHaveCount(3);
  await expect(page.locator('#empty-state')).toBeHidden();
});

test('Agent loading, add, manual remove, undo and repeat preserve unrelated edits', async ({ page }) => {
  await page.goto('/');
  const add = page.locator('#agent-add');
  await add.click();
  await expect(add).toBeDisabled();
  await expect(add).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#agent-result')).toHaveText('已為 3 個示例新增「技術文件」標籤。');
  await expect(page.getByRole('button', { name: /移除.*「技術文件」/ })).toHaveCount(3);
  await expect(page.locator('#agent-undo')).toBeFocused();
  await page.getByRole('button', { name: '移除 GitHub Docs 的「開發」標籤' }).click();
  await page.getByRole('button', { name: '移除 MDN Web Docs 的「技術文件」標籤' }).click();
  await page.locator('#agent-undo').click();
  await expect(page.getByRole('button', { name: /移除.*「技術文件」/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '移除 GitHub Docs 的「開發」標籤' })).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await expect(page.getByRole('button', { name: /移除.*「技術文件」/ })).toHaveCount(3);
  await page.getByRole('searchbox').fill('技術文件');
  await expect(page.locator('.bookmark-row:visible')).toHaveCount(3);
  await page.locator('#agent-undo').click();
  await expect(page.locator('#empty-state')).toBeVisible();
});

test('removing an active-filter tag moves focus to search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '參考', exact: true }).click();
  await page.getByRole('button', { name: '移除 MDN Web Docs 的「參考」標籤' }).click();
  await expect(page.locator('[data-bookmark="mdn"]')).toBeHidden();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.locator('#tag-feedback')).toContainText('已移除 MDN Web Docs');
});

test('keyboard skip link and anchor navigation respect sticky header', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至主要內容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
  await page.getByRole('link', { name: '先看一眼', exact: true }).click();
  await expect(page.locator('#preview')).toBeFocused();
  await expect(page).toHaveURL(/#preview$/);
  const preview = await page.locator('#preview').boundingBox();
  const header = await page.locator('.topnav').boundingBox();
  expect(preview.y).toBeGreaterThanOrEqual(header.height);
});

test('Workers serves built assets, canonical headers and real 404s', async ({ request }) => {
  for (const route of ['/', '/index.html', '/landing', '/landing.html']) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(response.headers()['link']).toBe('</>; rel="canonical"');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(await response.text()).toContain('Your bookmarks.');
  }
  for (const route of ['/missing', '/demo/bmd-landing-v2.html', '/src/main.js', '/package.json']) {
    expect((await request.get(route)).status()).toBe(404);
  }
  const html = await (await request.get('/')).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
  expect(assets.length).toBeGreaterThanOrEqual(2);
  for (const asset of assets) expect((await request.get(asset)).status()).toBe(200);
  expect((await request.get('/favicon.svg')).status()).toBe(200);
  const image = await request.get('/og-bmd.png');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
  expect((await image.body()).length).toBeGreaterThan(1000);
});

test('Pages uses the same landing page and working interactions', async ({ page, request }) => {
  const response = await page.goto('http://127.0.0.1:8789/');
  expect(response.status()).toBe(200);
  await expect(page.locator('[data-tags-for="mdn"] button')).toHaveCount(2);
  await page.locator('#agent-add').click();
  await expect(page.getByRole('button', { name: /移除.*「技術文件」/ })).toHaveCount(3);
  for (const route of ['/landing', '/landing.html']) {
    const alias = await request.get(`http://127.0.0.1:8789${route}?lang=en&ref=chrome`, { maxRedirects: 0 });
    expect(alias.status()).toBe(301);
    const target = new URL(alias.headers()['location'], 'http://127.0.0.1:8789');
    expect(target.pathname).toBe('/');
    expect(target.searchParams.get('lang')).toBe('en');
    expect(target.searchParams.get('ref')).toBe('chrome');
  }
  const missing = await request.get('http://127.0.0.1:8789/not-a-page');
  expect(missing.status()).toBe(404);
});

test('product copy and external bookmark links remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8788/');
  await expect(page.locator('h1')).toContainText('Your bookmarks.');
  await expect(page.getByRole('link', { name: 'MDN Web Docs' })).toBeVisible();
  await expect(page.locator('.noscript-note')).toBeVisible();
  await expect(page.locator('.language-picker')).toBeHidden();
  await context.close();
});

for (const [browserLocale, expected] of [
  ['en-US', 'en'], ['en-GB', 'en'], ['zh-TW', 'zh-Hant'],
  ['zh-HK', 'zh-Hant'], ['zh-CN', 'zh-Hans'], ['zh-SG', 'zh-Hans'], ['fr-FR', 'en']
]) {
  test(`browser ${browserLocale} selects ${expected} with translated metadata`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: browserLocale, baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', expected);
    await expect(page.locator('#language-select')).toHaveValue('auto');
    await expect(page).toHaveTitle(messages[expected].title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', messages[expected].description);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', messages[expected].ogLocale);
    await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', messages[expected].searchPlaceholder);
    await expect(page.getByRole('link', { name: 'MDN Web Docs' })).toHaveAttribute('href', messages[expected]['links.mdn']);
    await expect(page.getByRole('button', { name: messages[expected]['tags.reference'], exact: true })).toBeVisible();
    await context.close();
  });
}

test('manual language choice preserves bookmark state, URL parameters and persists until auto is selected', async ({ page }) => {
  await page.goto('/?ref=chrome#preview');
  await page.getByRole('button', { name: '移除 GitHub Docs 的「開發」標籤' }).click();
  await page.locator('#agent-add').click();
  await expect(page.locator('[data-tag="technicalDocs"]')).toHaveCount(3);
  await page.locator('[data-filter="reference"]').click();
  await page.getByRole('searchbox').fill('chrome');
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('searchbox')).toHaveValue('chrome');
  await expect(page.locator('[data-filter="reference"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#library-title')).toHaveText('Reference tags');
  await expect(page.locator('#agent-result')).toHaveText('Added “Technical docs” to 3 samples.');
  await expect(page.locator('.bookmark-row:visible')).toHaveCount(1);
  await expect(page.locator('[data-tag="technicalDocs"]')).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem('bmd-language'))).toBe('en');
  expect(new URL(page.url()).searchParams.get('ref')).toBe('chrome');
  expect(new URL(page.url()).hash).toBe('#preview');
  await page.locator('#agent-undo').click();
  await expect(page.locator('[data-tag="technicalDocs"]')).toHaveCount(0);
  await expect(page.locator('[data-bookmark="github"] [data-tag="development"]')).toHaveCount(0);
  await page.locator('#language-select').selectOption('zh-Hans');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await expect(page.locator('#language-select')).toHaveValue('zh-Hans');
  await page.locator('#language-select').selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  expect(await page.evaluate(() => localStorage.getItem('bmd-language'))).toBeNull();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.locator('#language-select')).toHaveValue('auto');
});

test('explicit URL language overrides saved preference and survives anchor navigation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bmd-language', 'zh-Hans'));
  await page.goto('/?lang=en&utm_source=test');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Take a peek', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('lang')).toBe('en');
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('test');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('browser preference order and inaccessible storage do not break automatic or manual language selection', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'zh-CN', 'en-US'] });
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Blocked storage', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#language-select').selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
});

test('switching languages during Agent loading translates the pending and completed status', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.locator('#agent-add').click();
  await expect(page.locator('#agent-add')).toBeDisabled();
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('#agent-add-label')).toHaveText('Organizing…');
  await expect(page.locator('#agent-result')).toHaveText('Demonstrating tag additions…');
  await page.clock.runFor(450);
  await expect(page.locator('#agent-result')).toHaveText('Added “Technical docs” to 3 samples.');
  await expect(page.locator('[data-tag="technicalDocs"]')).toHaveCount(3);
  await page.locator('#language-select').selectOption('zh-Hans');
  await expect(page.locator('#agent-result')).toHaveText('已为 3 个示例添加“技术文档”标签。');
  await page.locator('#agent-undo').click();
  await expect(page.locator('#agent-result')).toHaveText('已撤销本次添加的标签，其他手动更改保持不变。');
});