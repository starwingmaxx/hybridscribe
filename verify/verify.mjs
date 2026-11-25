import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EXE = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const URL = 'http://127.0.0.1:8091/';
const SHOTS = '/home/hatch/workspace/bounty/buildhybridai/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await sleep(600);

check('page loads with app title', await page.$eval('body', (b) => b.textContent.includes('HybridScribe')));
check('demo banner visible', await page.$('.demo-banner') !== null);
check('3 seed notes listed', (await page.$$('.note-item')).length === 3);
const nanoText = await page.$eval('#nano-status', (el) => el.textContent.trim());
check('nano status resolved', /Gemini Nano: (available|unavailable)/.test(nanoText), nanoText);
await page.screenshot({ path: `${SHOTS}/01-workspace.png` });

async function runAction(action, titlePart) {
  await page.click(`button[data-action="${action}"]`);
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('#results .result-card')].some(
      (c) => c.querySelector('h3')?.textContent.includes(t) && !c.classList.contains('pending')),
    { timeout: 20000 }, titlePart);
  await sleep(250);
  return page.$$eval('#results .result-card', (cards) => {
    const card = cards.find((c) => c.querySelector('h3')?.textContent.length);
    return cards.map((c) => ({
      title: c.querySelector('h3')?.textContent ?? '',
      badge: c.querySelector('.result-badge')?.textContent.trim() ?? '',
      meta: c.querySelector('.result-meta')?.textContent.trim() ?? '',
      text: c.querySelector('.result-copy')?.textContent.trim().slice(0, 90) ?? '',
    }));
  });
}

// Note 1 (Product sync, short) — on-device simulated routes
let cards = await runAction('summary', 'TL;DR');
check('TL;DR card with simulated on-device badge', cards.some((c) => c.title.includes('TL;DR') && c.badge.includes('simulated on-device')), JSON.stringify(cards.map((c) => c.badge)));

cards = await runAction('tags', 'Tags & mood');
const tagChips = await page.$$eval('#results .tags span', (els) => els.map((e) => e.textContent));
check('Tags & mood renders 3 tags', tagChips.length === 3, tagChips.join(', '));

cards = await runAction('brief', 'Deep brief');
check('Deep brief card with simulated cloud badge', cards.some((c) => c.title.includes('Deep brief') && c.badge.includes('simulated cloud')));

cards = await runAction('actions', 'Action items');
check('Action items card appears', cards.some((c) => c.title.includes('Action items') && c.text.length > 0), cards.find((c) => c.title.includes('Action'))?.text);

await page.select('#language', 'Japanese');
cards = await runAction('translate', 'Translate brief');
check('Translate card appears (Japanese)', cards.some((c) => c.title.includes('Translate brief') && c.title.includes('Japanese')));
await page.screenshot({ path: `${SHOTS}/02-results.png` });

// Note 2 (long research dump) — cloud route for quick actions
await page.click('.note-item[data-note="1"]');
await sleep(400);
const hint = await page.$eval('#route-hint', (el) => el.textContent.trim());
check('long note shows cloud-preferred hint', /Cloud preferred/.test(hint), hint);
cards = await runAction('summary', 'TL;DR');
check('long note TL;DR uses simulated cloud', cards.some((c) => c.title.includes('TL;DR') && c.badge.includes('simulated cloud')));
await page.screenshot({ path: `${SHOTS}/03-long-note-cloud.png` });

// New note flow
await page.click('#new-note');
await sleep(300);
await page.type('#note-text', 'Team retro: the deploy pipeline broke twice this week. Priya will automate the rollback script by Friday. We also decided to move standup to 9:30.');
await sleep(300);
cards = await runAction('summary', 'TL;DR');
check('new note TL;DR works', cards.some((c) => c.title.includes('TL;DR') && c.text.length > 0));

// Mobile viewport
await page.setViewport({ width: 390, height: 844 });
await sleep(400);
await page.screenshot({ path: `${SHOTS}/04-mobile.png` });
check('mobile renders notes workspace', await page.$eval('body', (b) => b.textContent.includes('Notes workspace')));

check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
