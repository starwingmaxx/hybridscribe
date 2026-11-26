import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';

// Local relay proxy: Chrome's challenge-response proxy auth does not work
// against this VM's egress proxy, so the relay adds preemptive
// Proxy-Authorization (which the egress proxy accepts) and Chrome talks to
// the relay without auth.
async function startRelay(upstream) {
  const auth = Buffer.from(
    `${decodeURIComponent(upstream.username)}:${decodeURIComponent(upstream.password)}`).toString('base64');
  const server = http.createServer((req, res) => {
    // Raw passthrough for plain-HTTP proxy requests (absolute-form URI).
    const upstreamSocket = net.connect(Number(upstream.port), upstream.hostname, () => {
      const headers = { ...req.headers, 'proxy-authorization': `Basic ${auth}`, connection: 'close' };
      const lines = [`${req.method} ${req.url} HTTP/1.1`,
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), '', ''];
      upstreamSocket.write(lines.join('\r\n'));
      req.pipe(upstreamSocket);
      upstreamSocket.pipe(res.socket);
    });
    upstreamSocket.on('error', () => { try { res.writeHead(502); res.end(); } catch { /* socket gone */ } });
  });
  server.on('connect', (req, clientSocket, head) => {
    const upstreamSocket = net.connect(Number(upstream.port), upstream.hostname, () => {
      upstreamSocket.write(
        `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n` +
        `Proxy-Authorization: Basic ${auth}\r\nProxy-Connection: Keep-Alive\r\n\r\n`);
    });
    let buf = Buffer.alloc(0);
    const onData = (d) => {
      buf = Buffer.concat([buf, d]);
      const idx = buf.indexOf('\r\n\r\n');
      if (idx === -1) return;
      upstreamSocket.off('data', onData);
      const statusLine = buf.slice(0, buf.indexOf('\r\n')).toString();
      if (!/ 200 /.test(statusLine)) { clientSocket.destroy(); upstreamSocket.destroy(); return; }
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      const rest = buf.slice(idx + 4);
      if (rest.length) clientSocket.write(rest);
      if (head?.length) upstreamSocket.write(head);
      upstreamSocket.pipe(clientSocket);
      clientSocket.pipe(upstreamSocket);
    };
    upstreamSocket.on('data', onData);
    upstreamSocket.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => upstreamSocket.destroy());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

const EXE = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const URL = process.env.APP_URL || 'http://127.0.0.1:8092/';
const SHOTS = process.env.SHOT_DIR || '/tmp/live-shots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proxyUrl = new globalThis.URL(process.env.https_proxy || process.env.HTTPS_PROXY);
const relay = await startRelay(proxyUrl);
const relayPort = relay.address().port;
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: process.env.HEADFUL ? false : 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
    ...(process.env.HEADFUL ? [] : ['--disable-gpu']),
    '--ignore-certificate-errors',
    `--proxy-server=http://127.0.0.1:${relayPort}`,
    '--proxy-bypass-list=127.0.0.1;localhost'],
});
const page = await browser.newPage();
if (process.env.HEADFUL) {
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
}
await page.setViewport({ width: 1280, height: 860 });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
const failedReqs = [];
page.on('requestfailed', (r) => failedReqs.push(`${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url().slice(0, 140)}`); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(1000);

check('page loads with app title', await page.$eval('body', (b) => b.textContent.includes('HybridScribe')));
check('demo banner ABSENT (live mode)', await page.$('.demo-banner') === null);
check('3 seed notes listed', (await page.$$('.note-item')).length === 3);

async function runAction(action, titlePart, timeout = 120000) {
  await page.click(`button[data-action="${action}"]`);
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('#results .result-card')].some(
      (c) => c.querySelector('h3')?.textContent.includes(t) && !c.classList.contains('pending')),
    { timeout }, titlePart);
  await sleep(300);
  return page.$$eval('#results .result-card', (cards) => cards.map((c) => ({
    title: c.querySelector('h3')?.textContent ?? '',
    badge: c.querySelector('.result-badge')?.textContent.trim() ?? '',
    meta: c.querySelector('.result-meta')?.textContent.trim() ?? '',
    error: c.classList.contains('error'),
    text: c.querySelector('.result-copy')?.textContent.trim().slice(0, 200) ?? '',
  })));
}

// Note 1 (short) — TL;DR requests on-device, should fall back to cloud in headless Chrome
let cards;
try {
  cards = await runAction('summary', 'TL;DR');
  const card = cards.find((c) => c.title.includes('TL;DR'));
  check('TL;DR returned a real result (not error)', !!card && !card.error, JSON.stringify(card));
  check('TL;DR badge is a live route (not Demo)', !!card && !/Demo/i.test(card.badge), card?.badge);
  check('TL;DR output non-empty', !!card && card.text.length > 10, card?.text);
} catch (e) {
  check('TL;DR completed', false, e.message);
  const dump = await page.$$eval('#results .result-card', (cs) => cs.map((c) => c.textContent.slice(0, 300)));
  console.log('cards dump:', JSON.stringify(dump));
}

try {
  cards = await runAction('tags', 'Tags & mood');
  const card = cards.find((c) => c.title.includes('Tags'));
  const tagChips = await page.$$eval('#results .tags span', (els) => els.map((e) => e.textContent));
  check('Tags returned a real result', !!card && !card.error, JSON.stringify(card));
  check('Tags renders 3 tags', tagChips.length === 3, tagChips.join(', '));
} catch (e) {
  check('Tags completed', false, e.message);
}

try {
  cards = await runAction('brief', 'Deep brief');
  const card = cards.find((c) => c.title.includes('Deep brief'));
  check('Deep brief returned a real result', !!card && !card.error, JSON.stringify(card));
  check('Deep brief badge is Cloud', !!card && /Cloud/.test(card.badge), card?.badge);
} catch (e) {
  check('Deep brief completed', false, e.message);
}

await page.screenshot({ path: `${SHOTS}/live-results.png` });

console.log('\npage errors:', pageErrors.slice(0, 8).join('\n  ') || '(none)');
console.log('failed/bad requests:', failedReqs.slice(0, 8).join('\n  ') || '(none)');

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} live checks passed`);
process.exit(failed ? 1 : 0);
