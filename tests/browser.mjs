import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const results = [];
const out = new URL('../test-results/', import.meta.url);
await mkdir(out, { recursive: true });
function check(name, condition) { assert.ok(condition, name); results.push({ name, passed: true }); }
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.url()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    check(`${width}px: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`${width}px: page title`, (await page.title()).includes('Orion Coffee'));
    check(`${width}px: exactly one H1`, await page.locator('h1').count() === 1);
    check(`${width}px: map deferred`, await page.locator('iframe').count() === 0);
    for (const image of await page.locator('img:not(dialog img)').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(el => el.decode());
    }
    check(`${width}px: all images loaded`, await page.locator('img:not(dialog img)').evaluateAll(items => items.every(i => i.naturalWidth > 0 && i.alt.length > 0)));
    if (width < 761) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator('.menu-toggle').click();
      check(`${width}px: mobile menu opens`, await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'true');
      await page.keyboard.press('Escape');
      check(`${width}px: mobile menu closes with Escape`, await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false');
      await page.locator('.menu-toggle').click();
      await page.locator('#navigation a[href="#galerie"]').click();
      check(`${width}px: navigation closes menu`, await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false');
    }
    await page.locator('[data-photo="0"]').click();
    check(`${width}px: gallery opens`, await page.locator('.lightbox').evaluate(d => d.open));
    await page.keyboard.press('ArrowRight');
    check(`${width}px: gallery next`, await page.locator('#lightbox-counter').innerText() === '2 / 3');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    check(`${width}px: gallery wraps`, await page.locator('#lightbox-counter').innerText() === '3 / 3');
    await page.keyboard.press('Escape');
    check(`${width}px: gallery closes and returns focus`, await page.locator('[data-photo="0"]').evaluate(el => el === document.activeElement));
    check(`${width}px: no JS errors`, errors.length === 0);
    check(`${width}px: no local 404 responses`, missing.length === 0);
    if ([390, 1440].includes(width)) {
      await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
      await page.screenshot({ path: fileURLToPath(new URL(width === 390 ? 'mobile.png' : 'desktop.png', out)), fullPage: true });
      await page.screenshot({ path: fileURLToPath(new URL(width === 390 ? 'mobile-hero.png' : 'desktop-hero.png', out)) });
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto(base);
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus());
  await page.locator('.copy-address').click();
  await page.waitForFunction(() => document.querySelector('.copy-status').textContent.includes('copiată'));
  check('copy-address writes exact address', await page.evaluate(() => navigator.clipboard.readText()) === 'Bulevardul Exemplului nr. 8, Constanța, 900000, România');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
  await page.locator('.copy-address').click();
  check('clipboard unavailable has usable selection fallback', (await page.locator('.copy-status').innerText()).includes('selectată') && (await page.evaluate(() => getSelection().toString())).includes('Exemplului nr. 8'));
  await page.route('https://www.google.com/maps/search/?api=1&query=Constan%C8%9Ba', route => route.fulfill({ contentType: 'text/html', body: '<p>Map test response</p>' }));
  await page.locator('#load-map').click();
  check('map loads only on explicit click', await page.locator('iframe').count() === 1);
  check('map has descriptive accessible title', (await page.locator('iframe').getAttribute('title')).includes('Exemplului nr. 8'));
  check('phone link is correct', (await page.locator('.phone-number').getAttribute('href')) === 'tel:+40700000801');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  check('local SEO is factual', schema['@type'] === 'CafeOrCoffeeShop' && schema.address.streetAddress === 'Bulevardul Exemplului nr. 8' && schema.telephone === '+40700000801' && !schema.aggregateRating && !schema.openingHours);
  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(items => items.filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.outerHTML));
  check('all internal anchor targets exist', brokenAnchors.length === 0);
  for (const route of ['/credite.html', '/confidentialitate.html']) {
    const response = await page.goto(base + route);
    check(`${route} loads`, response.status() === 200 && await page.locator('h1').count() === 1);
  }
  const response = await page.goto(base + '/missing-page');
  check('missing page returns HTTP 404', response.status() === 404);
  await context.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage();
  await fallback.goto(base);
  check('no-JS mobile navigation is available', await fallback.locator('#navigation a').first().isVisible());
  check('no-JS contact is available', await fallback.locator('.phone-number').getAttribute('href') === 'tel:+40700000801');
  check('no-JS gallery retains real image link', (await fallback.locator('.gallery-open').first().getAttribute('href')).endsWith('.jpg'));
  check('no-JS layout has no overflow', await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await noJs.close();
  console.log(`${results.length} assertions passed.`);
  await writeFile(new URL('results.json', out), JSON.stringify({ date: '2026-10-15', engine: 'Chromium', results }, null, 2));
} finally { await browser.close(); }
